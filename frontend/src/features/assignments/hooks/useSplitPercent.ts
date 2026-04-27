import { useLingui } from '@lingui/react/macro';
import { useZero } from '@rocicorp/zero/react';
import { mutators } from '@splitzy/shared-zero/mutators';
import Decimal from 'decimal.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { mergeSeedEntries } from '@/features/assignments/utils/merge-seed-entries';
import {
  evenShares,
  largestRemainderRound,
  rebalance,
  type ShareEntry,
} from '@/features/assignments/utils/split-percent';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getUserDisplayName } from '@/utils/user-display';

const PERSIST_DEBOUNCE_MS = 150;

/**
 * React-layer view of a single share row. Extends the pure {@link ShareEntry}
 * with display-only fields the UI needs (display name, color lookup key).
 */
export type DraftEntry = ShareEntry & {
  receiptUserId: string;
  displayName: string;
};

export type UseSplitPercentArgs = {
  item: ReceiptLineItem;
};

export type UseSplitPercentResult = {
  entries: DraftEntry[];
  roundedPercents: number[];
  handleChange: (assignmentId: string, value: Decimal) => void;
  handleToggleLock: (assignmentId: string) => void;
  handleReset: () => void;
};

/**
 * Owns the React-side orchestration for the "split by percent" tab:
 *
 *   - Seeds local draft state from the assignments coming off the receipt.
 *   - Re-seeds when the underlying assignments change (add/remove/remote update).
 *   - Debounces per-row writes back to Zero so slider drags coalesce into a
 *     single mutator call per row.
 *   - Exposes ready-to-render `entries` and `roundedPercents` plus the three
 *     handlers the view needs.
 *
 * All numerical work is delegated to the pure helpers in `../utils/split-percent`.
 */
export function useSplitPercent({
  item,
}: UseSplitPercentArgs): UseSplitPercentResult {
  const zero = useZero();
  const { t } = useLingui();

  const surfaceMutationError = useCallback(
    (
      result: {
        client: Promise<{ type: string; error?: { message: string } }>;
      },
      failureMessage: string
    ) => {
      result.client
        .then((clientResult) => {
          if (clientResult.type === 'error') {
            console.error(failureMessage, clientResult.error?.message);
            toast.error(failureMessage, {
              description: clientResult.error?.message,
            });
          }
        })
        .catch((error) => {
          console.error(failureMessage, error);
          toast.error(failureMessage, {
            description: error instanceof Error ? error.message : undefined,
          });
        });
    },
    []
  );

  // Only active assignments participate in the split; soft-deleted rows would
  // otherwise skew the even-share fallback and show ghost rows in the UI.
  const activeAssignments = useMemo(
    () => item.assignments.filter((assignment) => !assignment.deletedAt),
    [item.assignments]
  );

  // Build a stable key that changes whenever any assignment id, share, or
  // lock flag changes. Used to re-seed local state from the source of truth.
  const seedKey = useMemo(
    () =>
      activeAssignments
        .map(
          (assignment) =>
            `${assignment.id}:${assignment.sharePercentage?.toString() ?? 'null'}:${assignment.locked ? 1 : 0}`
        )
        .join('|'),
    [activeAssignments]
  );

  // Derive the initial draft entries from the receipt's assignments. Rows
  // without an explicit share split the leftover percentage evenly so they
  // don't over-allocate when siblings already have custom shares.
  const seedEntries = useMemo<DraftEntry[]>(() => {
    let sumCustom = new Decimal(0);
    let nullCount = 0;
    for (const assignment of activeAssignments) {
      if (assignment.sharePercentage != null) {
        sumCustom = sumCustom.plus(assignment.sharePercentage);
      } else {
        nullCount += 1;
      }
    }

    let fallbackPerNull = new Decimal(0);
    if (nullCount > 0) {
      const remaining = Decimal.max(0, new Decimal(100).minus(sumCustom));
      fallbackPerNull = remaining.dividedBy(nullCount);
    }

    return activeAssignments.map((assignment) => {
      let share: Decimal;
      if (assignment.sharePercentage != null) {
        // Persisted custom share exists → honor it.
        share = assignment.sharePercentage;
      } else {
        // No persisted share yet → split the remaining percentage evenly
        // across the other null rows.
        share = fallbackPerNull;
      }

      return {
        id: assignment.id,
        receiptUserId: assignment.receiptUserId,
        displayName: getUserDisplayName(assignment),
        share,
        locked: assignment.locked,
      };
    });
  }, [activeAssignments]);

  const [entries, setEntries] = useState<DraftEntry[]>(seedEntries);

  // Single in-flight debounce timer for the line item. Slider drags coalesce
  // into one batched `assignments.updateShares` call so the server validates
  // the post-state total atomically rather than per-row (which races with
  // sibling rebalances and trips the >100% guard).
  const pendingPersistRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    snapshot: DraftEntry[];
    pendingIds: Set<string>;
  } | null>(null);

  // Re-seed whenever the upstream assignments change so remote edits and
  // add/remove operations are reflected locally — but preserve any row
  // whose persist is still pending so an echoed sync can't yank a slider
  // mid-drag. Gated by `seedKey` (a value, not a reference) so reference
  // churn from unrelated Zero updates doesn't trigger reconciliation.
  const lastSeededKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSeededKeyRef.current === seedKey) return;
    lastSeededKeyRef.current = seedKey;

    const pending = pendingPersistRef.current;
    if (pending) {
      const seedIds = new Set(seedEntries.map((entry) => entry.id));
      const survivingPending = new Set<string>();
      for (const id of pending.pendingIds) {
        if (seedIds.has(id)) survivingPending.add(id);
      }
      if (survivingPending.size === 0) {
        clearTimeout(pending.timer);
        pendingPersistRef.current = null;
      } else if (survivingPending.size !== pending.pendingIds.size) {
        pending.pendingIds = survivingPending;
        pending.snapshot = pending.snapshot.filter((entry) =>
          seedIds.has(entry.id)
        );
      }
    }
    const pendingIds = new Set(pendingPersistRef.current?.pendingIds ?? []);
    setEntries((prev) => mergeSeedEntries(prev, seedEntries, pendingIds));
  }, [seedKey, seedEntries]);

  useEffect(() => {
    return () => {
      const pending = pendingPersistRef.current;
      if (pending) {
        clearTimeout(pending.timer);
        pendingPersistRef.current = null;
      }
    };
  }, []);

  const flushBatch = useCallback(
    (snapshot: DraftEntry[]) => {
      const result = zero.mutate(
        mutators.assignments.updateShares({
          receipt_line_item_id: item.id,
          updates: snapshot.map((entry) => ({
            id: entry.id,
            share_percentage: entry.share.toDecimalPlaces(4).toNumber(),
          })),
        })
      );
      surfaceMutationError(result, t`Failed to update shares`);
      pendingPersistRef.current = null;
    },
    [zero, item.id, surfaceMutationError, t]
  );

  const scheduleBatch = useCallback(
    (next: DraftEntry[], changedIds: Set<string>) => {
      const existing = pendingPersistRef.current;
      if (existing) {
        clearTimeout(existing.timer);
        for (const id of existing.pendingIds) changedIds.add(id);
      }
      const pendingIds = changedIds;
      const timer = setTimeout(() => {
        const current = pendingPersistRef.current;
        if (!current) return;
        flushBatch(current.snapshot);
      }, PERSIST_DEBOUNCE_MS);
      pendingPersistRef.current = {
        timer,
        snapshot: next,
        pendingIds,
      };
    },
    [flushBatch]
  );

  const handleChange = useCallback(
    (assignmentId: string, value: Decimal) => {
      // Delegate the math to the pure module. Any row whose share moved
      // joins the pending batch so the whole new state is persisted in
      // one atomic mutator call.
      const prev = entries;
      const next = rebalance(prev, assignmentId, value);
      const changedIds = new Set<string>();
      for (const entry of next) {
        const before = prev.find((candidate) => candidate.id === entry.id);
        if (!before || !before.share.equals(entry.share)) {
          changedIds.add(entry.id);
        }
      }
      setEntries(next);
      if (changedIds.size > 0) {
        scheduleBatch(next, changedIds);
      }
    },
    [entries, scheduleBatch]
  );

  const handleToggleLock = useCallback(
    (assignmentId: string) => {
      // Flip the lock flag for the targeted row only.
      const next = entries.map((entry) => {
        if (entry.id === assignmentId) {
          return { ...entry, locked: !entry.locked };
        }
        return entry;
      });
      const target = next.find((entry) => entry.id === assignmentId);

      setEntries(next);

      // Mirror the new lock state to Zero so it persists.
      if (target) {
        const result = zero.mutate(
          mutators.assignments.update({
            id: assignmentId,
            locked: target.locked,
          })
        );
        surfaceMutationError(result, t`Failed to update lock`);
      }
    },
    [entries, zero, surfaceMutationError, t]
  );

  const handleReset = useCallback(() => {
    // Reset: every row gets the even share and every lock is cleared.
    const share = evenShares(entries.length);
    const next = entries.map((entry) => ({
      ...entry,
      share,
      locked: false,
    }));

    setEntries(next);

    // Cancel any pending debounced batch so it can't clobber this reset.
    const pending = pendingPersistRef.current;
    if (pending) {
      clearTimeout(pending.timer);
      pendingPersistRef.current = null;
    }

    // Single batched transaction so the post-state total is validated once
    // and locks/shares move atomically.
    const sharePercentage = share.toDecimalPlaces(4).toNumber();
    const result = zero.mutate(
      mutators.assignments.updateShares({
        receipt_line_item_id: item.id,
        updates: next.map((entry) => ({
          id: entry.id,
          share_percentage: sharePercentage,
          locked: false,
        })),
      })
    );
    surfaceMutationError(result, t`Failed to reset shares`);
  }, [entries, zero, item.id, surfaceMutationError, t]);

  // Pre-compute the integer percents shown in the UI so the component layer
  // never has to deal with rounding math directly.
  const roundedPercents = useMemo(
    () => largestRemainderRound(entries.map((entry) => entry.share)),
    [entries]
  );

  return {
    entries,
    roundedPercents,
    handleChange,
    handleToggleLock,
    handleReset,
  };
}
