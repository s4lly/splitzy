import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import {
  itemHasCustomShares,
  planAddRebalance,
  planRemoveRebalance,
  type RebalanceAssignment,
  type SiblingShareUpdate,
} from './rebalance-shares.js';

// Small helpers keep the test cases concise and readable.
const decimal = (value: number | string) => new Decimal(value);

const makeAssignment = (
  id: string,
  share: number | string | null,
  locked = false
): RebalanceAssignment => ({
  id,
  sharePercentage: share == null ? null : decimal(share),
  locked,
});

// Sum helper used by the "everything still totals 100" assertions.
const sumUpdates = (updates: SiblingShareUpdate[]): number =>
  updates.reduce((total, update) => total + update.share_percentage, 0);

describe('itemHasCustomShares', () => {
  it('returns false for an empty list', () => {
    expect(itemHasCustomShares([])).toBe(false);
  });

  it('returns false when every assignment has a null share', () => {
    expect(
      itemHasCustomShares([
        makeAssignment('a', null),
        makeAssignment('b', null),
      ])
    ).toBe(false);
  });

  it('returns true when at least one assignment has a non-null share', () => {
    expect(
      itemHasCustomShares([makeAssignment('a', null), makeAssignment('b', 50)])
    ).toBe(true);
  });
});

describe('planAddRebalance', () => {
  it('returns null when no sibling has a custom share', () => {
    expect(
      planAddRebalance([makeAssignment('a', null), makeAssignment('b', null)])
    ).toBeNull();
  });

  it('rescales three equal unlocked siblings and gives newcomer a fair 25', () => {
    const result = planAddRebalance([
      makeAssignment('a', decimal(100).div(3).toString()),
      makeAssignment('b', decimal(100).div(3).toString()),
      makeAssignment('c', decimal(100).div(3).toString()),
    ]);

    expect(result).not.toBeNull();
    expect(result!.warning).toBeNull();
    expect(result!.newcomerShare).toBeCloseTo(25, 10);

    for (const update of result!.siblingUpdates) {
      expect(update.share_percentage).toBeCloseTo(25, 10);
    }

    expect(
      sumUpdates(result!.siblingUpdates) + result!.newcomerShare
    ).toBeCloseTo(100, 10);
  });

  it('caps the newcomer at headroom when locked siblings limit the budget', () => {
    const result = planAddRebalance([
      makeAssignment('a', 60, true),
      makeAssignment('b', 40, false),
    ]);

    expect(result).not.toBeNull();
    expect(result!.warning).toBeNull();
    // Fair = 100/3 ≈ 33.33, headroom = 40 → newcomer gets the smaller (fair).
    expect(result!.newcomerShare).toBeCloseTo(100 / 3, 10);
    // Only the unlocked sibling appears in updates; it absorbs the remaining headroom.
    expect(result!.siblingUpdates).toHaveLength(1);
    expect(result!.siblingUpdates[0].id).toBe('b');
    expect(result!.siblingUpdates[0].share_percentage).toBeCloseTo(
      40 - 100 / 3,
      10
    );
  });

  it('returns the fully-locked warning when locked shares already sum to 100', () => {
    const result = planAddRebalance([makeAssignment('a', 100, true)]);

    expect(result).toEqual({
      newcomerShare: 0,
      newcomerLocked: false,
      siblingUpdates: [],
      warning: 'fully-locked',
    });
  });

  it('returns the fully-locked warning when every sibling is locked (even with sub-100 total)', () => {
    const result = planAddRebalance([
      makeAssignment('a', 40, true),
      makeAssignment('b', 40, true),
    ]);

    expect(result!.warning).toBe('fully-locked');
    expect(result!.newcomerShare).toBe(0);
    expect(result!.siblingUpdates).toEqual([]);
  });

  it('splits remaining evenly when unlocked siblings sum to zero and locks leave headroom', () => {
    const result = planAddRebalance([
      makeAssignment('a', 0, false),
      makeAssignment('b', 0, false),
      makeAssignment('c', 50, true),
    ]);

    expect(result!.warning).toBeNull();
    // Fair = 100/4 = 25, headroom = 50, newcomer = 25, remaining = 25, split evenly = 12.5 each.
    expect(result!.newcomerShare).toBeCloseTo(25, 10);
    expect(result!.siblingUpdates).toHaveLength(2);
    expect(result!.siblingUpdates[0].share_percentage).toBeCloseTo(12.5, 10);
    expect(result!.siblingUpdates[1].share_percentage).toBeCloseTo(12.5, 10);
  });
});

describe('planRemoveRebalance', () => {
  it('returns null when the removed assignment had no custom share', () => {
    expect(
      planRemoveRebalance(makeAssignment('a', null), [makeAssignment('b', 50)])
    ).toBeNull();
  });

  it('returns null when no sibling remains', () => {
    expect(planRemoveRebalance(makeAssignment('a', 100), [])).toBeNull();
  });

  it('distributes the removed share proportionally to unlocked siblings', () => {
    const updates = planRemoveRebalance(makeAssignment('a', 30), [
      makeAssignment('b', 40),
      makeAssignment('c', 30),
    ]);

    expect(updates).not.toBeNull();
    expect(updates).toHaveLength(2);
    // 40 + (40/70)*30 ≈ 57.142857; 30 + (30/70)*30 ≈ 42.857143; sum ≈ 100.
    expect(updates![0].share_percentage).toBeCloseTo(40 + (40 / 70) * 30, 10);
    expect(updates![1].share_percentage).toBeCloseTo(30 + (30 / 70) * 30, 10);
    expect(sumUpdates(updates!)).toBeCloseTo(100, 10);
  });

  it('writes an even split across everyone when all remaining siblings are locked', () => {
    const updates = planRemoveRebalance(makeAssignment('a', 40), [
      makeAssignment('b', 30, true),
      makeAssignment('c', 30, true),
    ]);

    expect(updates).not.toBeNull();
    expect(updates).toHaveLength(2);
    expect(updates![0].share_percentage).toBeCloseTo(50, 10);
    expect(updates![1].share_percentage).toBeCloseTo(50, 10);
    // The mutator does a partial update, so `locked: false` must be sent
    // explicitly to clear the locks on the previously-locked siblings.
    expect(updates![0].locked).toBe(false);
    expect(updates![1].locked).toBe(false);
  });

  it('splits the removed share evenly when the unlocked pool sums to zero', () => {
    const updates = planRemoveRebalance(makeAssignment('a', 60), [
      makeAssignment('b', 0, false),
      makeAssignment('c', 0, false),
      makeAssignment('d', 40, true),
    ]);

    expect(updates).not.toBeNull();
    expect(updates).toHaveLength(2);
    // Each unlocked sibling absorbs half of the 60 → 30.
    expect(updates![0].share_percentage).toBeCloseTo(30, 10);
    expect(updates![1].share_percentage).toBeCloseTo(30, 10);
  });
});
