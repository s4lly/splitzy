import Decimal from 'decimal.js';

/**
 * Minimal data shape consumed by {@link rebalance}.
 *
 * Decoupled from the React-layer `DraftEntry` so that this module can be
 * reused (or moved to a shared location) without dragging UI-only fields
 * like display name or avatar color.
 */
export type ShareEntry = {
  id: string;
  share: Decimal;
  locked: boolean;
};

const ZERO = new Decimal(0);
const ONE_HUNDRED = new Decimal(100);

/**
 * Rounds a list of fractional percentages to integers that sum to exactly 100
 * using the largest-remainder (Hamilton) method.
 *
 * Each input is floored, then the leftover deficit is distributed one percent
 * at a time to the entries with the largest fractional remainder. This keeps
 * the displayed total at 100% without visually biasing any particular row.
 *
 * @param shares - Fractional percentage values (e.g. `33.333…`) that should
 *                 themselves sum to roughly 100. Order is preserved in the
 *                 returned array.
 * @returns Integer percentages in the same order as `shares`, summing to 100
 *          (or to 0 when `shares` is empty).
 *
 * @example
 *   largestRemainderRound([
 *     new Decimal(100).div(3),
 *     new Decimal(100).div(3),
 *     new Decimal(100).div(3),
 *   ]);
 *   // → [34, 33, 33]
 *
 * @example
 *   largestRemainderRound([new Decimal(50), new Decimal(50)]);
 *   // → [50, 50]
 */
export function largestRemainderRound(shares: Decimal[]): number[] {
  // Empty input → nothing to distribute; short-circuit so the reducer below
  // doesn't have to special-case the no-entry total.
  if (shares.length === 0) {
    return [];
  }

  // Floor each share and keep its fractional remainder so we can rank
  // candidates for the +1 leftover distribution.
  const floors = shares.map((share) => share.floor().toNumber());
  const remainders = shares.map((share, index) => ({
    index,
    fraction: share.minus(share.floor()),
  }));

  // Compute how many integer points we still need to hand out to reach 100.
  const flooredSum = floors.reduce((sum, value) => sum + value, 0);
  let deficit = 100 - flooredSum;

  // Rank entries by largest fractional remainder so those closest to rounding
  // up get priority.
  remainders.sort((left, right) => right.fraction.comparedTo(left.fraction));

  // Hand out one percent at a time until the deficit is exhausted.
  const result = [...floors];
  for (let rank = 0; rank < remainders.length && deficit > 0; rank += 1) {
    result[remainders[rank].index] += 1;
    deficit -= 1;
  }

  return result;
}

/**
 * Returns an equal share for each of `count` participants, expressed as a
 * percentage (0–100) in `Decimal` precision.
 *
 * @param count - Number of participants to divide the 100% evenly between.
 * @returns `100 / count` as a {@link Decimal}, or `0` when `count` is 0 to
 *          avoid division-by-zero.
 *
 * @example
 *   evenShares(4).toNumber(); // → 25
 *   evenShares(3).toString(); // → "33.3333…"
 *   evenShares(0).toNumber(); // → 0
 */
export function evenShares(count: number): Decimal {
  // No participants → no share to assign; return a concrete zero rather than
  // NaN so callers can blindly use the result in further arithmetic.
  if (count <= 0) {
    return ZERO;
  }

  return ONE_HUNDRED.div(count);
}

/**
 * Produces the next share distribution after a single entry is changed.
 *
 * Rules:
 *   1. The target entry's new share is clamped into `[0, 100 - lockedSum]`
 *      so locked entries are never disturbed.
 *   2. Other unlocked entries absorb the remainder proportionally to their
 *      current shares.
 *   3. When the unlocked siblings currently sum to zero, the remainder is
 *      split evenly between them instead (proportional scaling would produce
 *      0/0).
 *   4. Locked entries and a locked or missing target return the input
 *      unchanged.
 *
 * @param entries - The current share distribution. Order is preserved.
 * @param targetId - Id of the entry the user just edited.
 * @param newValue - The requested new share for the target, in percent
 *                   (0–100). Values outside that range are clamped.
 * @returns A new array with updated shares. Reference-equal to `entries` only
 *          when no change is applied (target missing / locked).
 *
 * @example
 *   // Two unlocked entries at 50/50; raise the first to 80 → second falls to 20.
 *   rebalance(
 *     [
 *       { id: 'a', share: new Decimal(50), locked: false },
 *       { id: 'b', share: new Decimal(50), locked: false },
 *     ],
 *     'a',
 *     new Decimal(80),
 *   );
 *   // → [{ id: 'a', share: 80, locked: false }, { id: 'b', share: 20, locked: false }]
 *
 * @example
 *   // One locked entry at 40; raising 'b' past 60 is clamped.
 *   rebalance(
 *     [
 *       { id: 'a', share: new Decimal(40), locked: true  },
 *       { id: 'b', share: new Decimal(30), locked: false },
 *       { id: 'c', share: new Decimal(30), locked: false },
 *     ],
 *     'b',
 *     new Decimal(90),
 *   );
 *   // → b clamped to 60, c falls to 0, a stays at 40
 */
export function rebalance(
  entries: ShareEntry[],
  targetId: string,
  newValue: Decimal
): ShareEntry[] {
  // Target is missing or locked → nothing to do; return the input unchanged so
  // callers can use reference equality to skip a re-render.
  const target = entries.find((entry) => entry.id === targetId);
  if (!target || target.locked) {
    return entries;
  }

  // Locked entries hold a fixed portion of the pie; we can only redistribute
  // what's left after setting them aside.
  const lockedSum = entries
    .filter((entry) => entry.locked)
    .reduce((sum, entry) => sum.plus(entry.share), ZERO);

  // Clamp the requested value into the budget available to unlocked entries.
  let clamped = Decimal.max(ZERO, Decimal.min(ONE_HUNDRED, newValue));
  const maxForTarget = ONE_HUNDRED.minus(lockedSum);
  if (clamped.greaterThan(maxForTarget)) {
    // Requested value would exceed what's available after honoring locks.
    clamped = maxForTarget;
  }

  // Gather unlocked siblings (everyone except the target and the locks) and
  // the remaining percentage they collectively need to absorb.
  const siblings = entries.filter(
    (entry) => entry.id !== targetId && !entry.locked
  );
  const remaining = ONE_HUNDRED.minus(clamped).minus(lockedSum);
  const siblingSum = siblings.reduce(
    (sum, entry) => sum.plus(entry.share),
    ZERO
  );

  // Produce the next array preserving original order.
  return entries.map((entry) => {
    if (entry.id === targetId) {
      // This is the row the user just edited → write the clamped value.
      return { ...entry, share: clamped };
    }

    if (entry.locked) {
      // Locked rows are invariants by definition; leave them untouched.
      return entry;
    }

    if (siblingSum.isZero()) {
      // Siblings collectively sum to zero → proportional scaling would be 0/0,
      // so fall back to splitting the remainder evenly between them.
      const denominator = Math.max(siblings.length, 1);
      return { ...entry, share: remaining.div(denominator) };
    }

    // General case: each sibling keeps its previous proportion of the
    // unlocked pool, scaled into the new `remaining` budget.
    const nextShare = entry.share.div(siblingSum).mul(remaining);
    return { ...entry, share: nextShare };
  });
}
