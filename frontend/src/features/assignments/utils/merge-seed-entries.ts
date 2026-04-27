import type Decimal from 'decimal.js';

type MergeableEntry = {
  id: string;
  share: Decimal;
  locked: boolean;
  displayName: string;
  receiptUserId: string;
};

/**
 * Reconciles locally-held draft entries with a freshly-derived seed from the
 * source of truth. Rows whose ids are in `pendingIds` represent in-flight
 * user edits that have not yet been persisted (or whose persist is being
 * debounced); their local values are preserved so an echoed sync can't
 * clobber a continuing slider drag.
 *
 * Returns the exact `prev` reference when the merged result is structurally
 * identical, so React's `setEntries` can bail out of re-rendering.
 */
export function mergeSeedEntries<T extends MergeableEntry>(
  prev: T[],
  seed: T[],
  pendingIds: ReadonlySet<string>
): T[] {
  const prevById = new Map(prev.map((entry) => [entry.id, entry]));
  let changed = prev.length !== seed.length;

  const merged = seed.map((seedEntry, index) => {
    const priorAtIndex = prev[index];
    const priorById = prevById.get(seedEntry.id);

    if (priorById && pendingIds.has(seedEntry.id)) {
      if (priorAtIndex !== priorById) {
        changed = true;
      }
      return priorById;
    }

    if (
      !priorAtIndex ||
      priorAtIndex.id !== seedEntry.id ||
      !priorAtIndex.share.equals(seedEntry.share) ||
      priorAtIndex.locked !== seedEntry.locked ||
      priorAtIndex.displayName !== seedEntry.displayName ||
      priorAtIndex.receiptUserId !== seedEntry.receiptUserId
    ) {
      changed = true;
    }
    return seedEntry;
  });

  return changed ? merged : prev;
}
