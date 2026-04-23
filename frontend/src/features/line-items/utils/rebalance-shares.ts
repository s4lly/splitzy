import Decimal from 'decimal.js';

/**
 * Minimal structural shape consumed by the rebalance planners.
 *
 * Decoupled from the richer `Assignment` model so this module stays a pure
 * utility with no dependency on receipt-collab types; any caller whose
 * records expose `id`, `sharePercentage`, and `locked` can pass them in.
 */
export type RebalanceAssignment = {
  id: string;
  sharePercentage: Decimal | null;
  locked: boolean;
};

/**
 * Update payload for a single sibling assignment, shaped for the Zero
 * mutator (`share_percentage` as a raw `number`, not a `Decimal`).
 */
export type SiblingShareUpdate = {
  id: string;
  share_percentage: number;
};

/**
 * Result of planning the share distribution when a new assignment is added.
 *
 * `warning: 'fully-locked'` indicates the newcomer cannot receive any share
 * because the locked siblings already consume the entire 100% budget or no
 * unlocked sibling is available to donate.
 */
export type AddRebalanceResult = {
  newcomerShare: number;
  newcomerLocked: boolean;
  siblingUpdates: SiblingShareUpdate[];
  warning: 'fully-locked' | null;
};

// Module-local Decimal constants mirror the convention used by
// `features/assignments/utils/split-percent.ts` so arithmetic reads cleanly.
const ZERO = new Decimal(0);
const ONE_HUNDRED = new Decimal(100);

/**
 * Returns `true` if any assignment in the list has a custom (non-null)
 * share percentage — i.e. the item is in "percent" split mode rather than
 * even-split.
 *
 * @param assignments - The active assignments on a single line item.
 * @returns `true` when at least one assignment carries a `sharePercentage`.
 *
 * @example
 *   itemHasCustomShares([]); // → false
 *
 * @example
 *   itemHasCustomShares([
 *     { id: 'a', sharePercentage: null,               locked: false },
 *     { id: 'b', sharePercentage: new Decimal(60),    locked: true  },
 *   ]);
 *   // → true
 */
export function itemHasCustomShares(
  assignments: readonly RebalanceAssignment[]
): boolean {
  return assignments.some((assignment) => assignment.sharePercentage != null);
}

/**
 * Plan the share redistribution that should accompany adding a new
 * assignment to a line item that already uses custom shares.
 *
 * The policy is:
 *   1. If no existing sibling has a custom share (even-split regime), do
 *      nothing — return `null` so the caller can create the new assignment
 *      with `share_percentage: null`.
 *   2. Otherwise, compute the headroom left after honoring locked siblings.
 *      If no headroom or no unlocked sibling can donate, surface a
 *      `fully-locked` warning and give the newcomer 0%.
 *   3. Otherwise, award the newcomer `min(fair, headroom)` where
 *      `fair = 100 / (n + 1)`, and rescale the unlocked siblings so they
 *      collectively absorb the remaining headroom (proportionally to their
 *      current shares; evenly when their current shares sum to zero).
 *
 * @param activeSiblings - The item's active (non-deleted) assignments,
 *                          excluding the newcomer.
 * @returns A plan describing the newcomer's share and sibling updates, or
 *          `null` when no rebalance is needed.
 *
 * @example
 *   // Even-split regime → no plan needed.
 *   planAddRebalance([
 *     { id: 'a', sharePercentage: null, locked: false },
 *   ]);
 *   // → null
 *
 * @example
 *   // Three equal unlocked siblings → newcomer gets 25, each sibling scales to 25.
 *   planAddRebalance([
 *     { id: 'a', sharePercentage: new Decimal(100).div(3), locked: false },
 *     { id: 'b', sharePercentage: new Decimal(100).div(3), locked: false },
 *     { id: 'c', sharePercentage: new Decimal(100).div(3), locked: false },
 *   ]);
 *   // → { newcomerShare: 25, newcomerLocked: false, siblingUpdates: [...three at 25], warning: null }
 *
 * @example
 *   // Locked siblings sum to 100 → nobody can give → fully-locked warning.
 *   planAddRebalance([
 *     { id: 'a', sharePercentage: new Decimal(100), locked: true },
 *   ]);
 *   // → { newcomerShare: 0, newcomerLocked: false, siblingUpdates: [], warning: 'fully-locked' }
 */
export function planAddRebalance(
  activeSiblings: readonly RebalanceAssignment[]
): AddRebalanceResult | null {
  // Short-circuit when the item is still in even-split mode — the caller
  // will create the new assignment with a null share and we don't touch
  // any sibling.
  if (!itemHasCustomShares(activeSiblings)) {
    return null;
  }

  // Project each sibling into a local `Decimal`-typed record so all
  // arithmetic below stays in Decimal space and we don't lose precision to
  // raw `number` operations.
  const siblings = activeSiblings.map((assignment) => ({
    id: assignment.id,
    share: assignment.sharePercentage ?? ZERO,
    locked: assignment.locked,
  }));

  // Split the siblings into their locked vs. unlocked pools and sum the
  // locked pool — locked shares are invariants we must leave alone.
  const lockedSum = siblings
    .filter((sibling) => sibling.locked)
    .reduce((accumulator, sibling) => accumulator.plus(sibling.share), ZERO);
  const unlocked = siblings.filter((sibling) => !sibling.locked);
  const unlockedSum = unlocked.reduce(
    (accumulator, sibling) => accumulator.plus(sibling.share),
    ZERO
  );

  // Headroom is the total percent still available after honoring locks;
  // clamped to zero so a slightly-over-100 locked pool doesn't go negative.
  const headroom = Decimal.max(ZERO, ONE_HUNDRED.minus(lockedSum));

  // No budget available, or no unlocked sibling willing to donate → the
  // newcomer can't be given any share; surface the fully-locked warning so
  // the UI layer can inform the user.
  if (headroom.lessThanOrEqualTo(ZERO) || unlocked.length === 0) {
    return {
      newcomerShare: 0,
      newcomerLocked: false,
      siblingUpdates: [],
      warning: 'fully-locked',
    };
  }

  // The newcomer gets their "fair" slice of a group one larger than today,
  // but capped by the headroom so we never exceed the locked budget.
  const fair = ONE_HUNDRED.div(siblings.length + 1);
  let newcomerShare = fair;
  if (newcomerShare.greaterThan(headroom)) {
    // Fair slice would exceed what locks leave us; cap at the headroom.
    newcomerShare = headroom;
  }
  const remainingForUnlocked = headroom.minus(newcomerShare);

  // Distribute `remainingForUnlocked` across the unlocked pool. When their
  // current shares sum to something positive, scale proportionally so each
  // sibling keeps its existing ratio. When they sum to zero, proportional
  // scaling would be 0/0 — fall back to splitting the remainder evenly.
  const siblingUpdates: SiblingShareUpdate[] = unlocked.map((sibling) => {
    if (unlockedSum.greaterThan(ZERO)) {
      // General case: preserve each sibling's fraction of the unlocked pool.
      const nextShare = sibling.share
        .div(unlockedSum)
        .mul(remainingForUnlocked);
      return { id: sibling.id, share_percentage: nextShare.toNumber() };
    }

    // Degenerate case: every unlocked sibling is currently at zero. Split
    // the remaining budget evenly between them instead of dividing by zero.
    const evenShare = remainingForUnlocked.div(unlocked.length);
    return { id: sibling.id, share_percentage: evenShare.toNumber() };
  });

  return {
    newcomerShare: newcomerShare.toNumber(),
    newcomerLocked: false,
    siblingUpdates,
    warning: null,
  };
}

/**
 * Plan the share redistribution that should accompany removing an
 * assignment from a line item using custom shares.
 *
 * The policy is:
 *   1. If the removed assignment had no custom share, or no sibling
 *      remains, return `null` — the item either wasn't in percent mode or
 *      there's nothing left to redistribute onto.
 *   2. If every remaining sibling is locked, redistribute evenly across
 *      all of them. Writing fresh shares implicitly clears the locks at
 *      the call site (the mutator overwrites the share without a lock
 *      flag), which is the desired escape hatch.
 *   3. Otherwise, unlocked siblings absorb the removed share
 *      proportionally (evenly when their current shares sum to zero).
 *
 * @param removed - The assignment being removed.
 * @param remainingActive - The sibling assignments remaining after removal
 *                           (already filtered to exclude the removed one
 *                           and any soft-deleted rows).
 * @returns An array of sibling updates, or `null` when no redistribution
 *          should happen.
 *
 * @example
 *   // Removed had no custom share → no plan.
 *   planRemoveRebalance(
 *     { id: 'a', sharePercentage: null, locked: false },
 *     [{ id: 'b', sharePercentage: new Decimal(50), locked: false }],
 *   );
 *   // → null
 *
 * @example
 *   // Removing 30 with two unlocked siblings at 40 and 30 → they absorb proportionally.
 *   planRemoveRebalance(
 *     { id: 'a', sharePercentage: new Decimal(30), locked: false },
 *     [
 *       { id: 'b', sharePercentage: new Decimal(40), locked: false },
 *       { id: 'c', sharePercentage: new Decimal(30), locked: false },
 *     ],
 *   );
 *   // → [{ id: 'b', share_percentage: 40 + (40/70)*30 }, { id: 'c', share_percentage: 30 + (30/70)*30 }]
 *
 * @example
 *   // All remaining locked → even-split across all clears the locks implicitly.
 *   planRemoveRebalance(
 *     { id: 'a', sharePercentage: new Decimal(40), locked: false },
 *     [
 *       { id: 'b', sharePercentage: new Decimal(30), locked: true },
 *       { id: 'c', sharePercentage: new Decimal(30), locked: true },
 *     ],
 *   );
 *   // → [{ id: 'b', share_percentage: 50 }, { id: 'c', share_percentage: 50 }]
 */
export function planRemoveRebalance(
  removed: RebalanceAssignment,
  remainingActive: readonly RebalanceAssignment[]
): SiblingShareUpdate[] | null {
  // The removed row didn't contribute a custom share, so the item is in
  // even-split mode and no sibling needs adjusting.
  if (removed.sharePercentage == null) {
    return null;
  }

  // Nothing left to redistribute onto — the item will just be empty.
  if (remainingActive.length === 0) {
    return null;
  }

  // Lift everyone into Decimal space. When a sibling is in percent mode
  // but has no explicit share, fall back to the even-split value they
  // would have had; this mirrors the pre-refactor behavior.
  const removedShare = removed.sharePercentage;
  const evenFallback = ONE_HUNDRED.div(remainingActive.length);
  const siblings = remainingActive.map((assignment) => ({
    id: assignment.id,
    share: assignment.sharePercentage ?? evenFallback,
    locked: assignment.locked,
  }));

  // Partition into the unlocked pool (who will normally absorb the share)
  // and compute the sum we'll use for proportional scaling.
  const unlocked = siblings.filter((sibling) => !sibling.locked);
  const unlockedSum = unlocked.reduce(
    (accumulator, sibling) => accumulator.plus(sibling.share),
    ZERO
  );

  // Every remaining sibling is locked → no one can absorb the removed
  // share without breaking a lock. Overwrite everyone with an even split
  // instead; the mutator call site will clear the lock flag implicitly.
  if (unlocked.length === 0) {
    const evenShare = ONE_HUNDRED.div(siblings.length);
    return siblings.map((sibling) => ({
      id: sibling.id,
      share_percentage: evenShare.toNumber(),
    }));
  }

  // Normal path: grow each unlocked sibling's share by its proportional
  // slice of the removed share, or split evenly when the unlocked pool
  // sums to zero (to avoid a 0/0 ratio).
  return unlocked.map((sibling) => {
    if (unlockedSum.greaterThan(ZERO)) {
      // Proportional absorption: preserve each unlocked sibling's ratio.
      const nextShare = sibling.share.plus(
        sibling.share.div(unlockedSum).mul(removedShare)
      );
      return { id: sibling.id, share_percentage: nextShare.toNumber() };
    }

    // Degenerate: every unlocked sibling was already at zero, so split
    // the removed share evenly between them.
    const nextShare = sibling.share.plus(removedShare.div(unlocked.length));
    return { id: sibling.id, share_percentage: nextShare.toNumber() };
  });
}
