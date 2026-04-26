import { useZero } from '@rocicorp/zero/react';
import { mutators } from '@splitzy/shared-zero/mutators';
import Decimal from 'decimal.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  // Re-seed whenever the upstream assignments change so remote edits and
  // add/remove operations are reflected locally.
  useEffect(() => {
    setEntries(seedEntries);
  }, [seedKey, seedEntries]);

  // Per-assignment debounce timers. Kept in a ref so re-renders don't reset
  // pending writes mid-flight.
  const persistTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    const timers = persistTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const persistShare = useCallback(
    (assignmentId: string, share: Decimal) => {
      // Replace any in-flight timer for this row so rapid slider moves
      // coalesce into a single mutator call.
      const existing = persistTimers.current.get(assignmentId);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        void zero.mutate(
          mutators.assignments.update({
            id: assignmentId,
            share_percentage: share.toDecimalPlaces(4).toNumber(),
          })
        );
        persistTimers.current.delete(assignmentId);
      }, PERSIST_DEBOUNCE_MS);

      persistTimers.current.set(assignmentId, timer);
    },
    [zero]
  );

  const persistChangedShares = useCallback(
    (next: DraftEntry[], previous: DraftEntry[]) => {
      // Diff each row so we only schedule a write when its share actually
      // moved. Sibling rebalancing legitimately touches every unlocked row.
      for (const entry of next) {
        const prev = previous.find((candidate) => candidate.id === entry.id);
        if (!prev || !prev.share.equals(entry.share)) {
          persistShare(entry.id, entry.share);
        }
      }
    },
    [persistShare]
  );

  const handleChange = useCallback(
    (assignmentId: string, value: Decimal) => {
      setEntries((prev) => {
        // Delegate the math to the pure module and persist any row whose
        // share ended up different from its previous value.
        const next = rebalance(prev, assignmentId, value);
        persistChangedShares(next, prev);
        return next;
      });
    },
    [persistChangedShares]
  );

  const handleToggleLock = useCallback(
    (assignmentId: string) => {
      setEntries((prev) => {
        // Flip the lock flag for the targeted row only.
        const next = prev.map((entry) => {
          if (entry.id === assignmentId) {
            return { ...entry, locked: !entry.locked };
          }
          return entry;
        });

        // Mirror the new lock state to Zero so it persists.
        const target = next.find((entry) => entry.id === assignmentId);
        if (target) {
          void zero.mutate(
            mutators.assignments.update({
              id: assignmentId,
              locked: target.locked,
            })
          );
        }

        return next;
      });
    },
    [zero]
  );

  const handleReset = useCallback(() => {
    setEntries((prev) => {
      // Reset: every row gets the even share and every lock is cleared.
      const share = evenShares(prev.length);
      const next = prev.map((entry) => ({
        ...entry,
        share,
        locked: false,
      }));

      // Fire-and-forget a write for every row so the persisted state matches
      // what the user sees. This bypasses the debounce intentionally — a
      // reset is a single discrete action, not a drag.
      const sharePercentage = share.toDecimalPlaces(4).toNumber();
      for (const entry of next) {
        // Cancel any pending debounced write so it can't clobber this reset.
        const pending = persistTimers.current.get(entry.id);
        if (pending) {
          clearTimeout(pending);
          persistTimers.current.delete(entry.id);
        }
        void zero.mutate(
          mutators.assignments.update({
            id: entry.id,
            share_percentage: sharePercentage,
            locked: false,
          })
        );
      }

      return next;
    });
  }, [zero]);

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
