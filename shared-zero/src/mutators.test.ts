import { describe, expect, it } from 'vitest';

import { planAssignmentDelete, wouldExceedShareLimit } from './mutators.js';
import type { Assignment } from './schema.js';

const makeAssignment = (overrides: Partial<Assignment>): Assignment =>
  ({
    id: 'self',
    receipt_user_id: 'user-1',
    receipt_line_item_id: 'item-1',
    created_at: 0,
    locked: false,
    share_percentage: null,
    deleted_at: null,
    ...overrides,
  }) as Assignment;

describe('planAssignmentDelete', () => {
  it('returns sibling updates when deleting a custom-share row with unlocked siblings', () => {
    const self = makeAssignment({ id: 'a', share_percentage: 30 });
    const cohort = [
      self,
      makeAssignment({ id: 'b', share_percentage: 40 }),
      makeAssignment({ id: 'c', share_percentage: 30 }),
    ];

    const plan = planAssignmentDelete('a', self, cohort);

    expect(plan).not.toBeNull();
    expect(plan!.siblingUpdates).toHaveLength(2);
    const byId = Object.fromEntries(
      plan!.siblingUpdates.map((u) => [u.id, u.share_percentage])
    );
    // 30 absorbed proportionally across (40, 30): b → 40 + (40/70)*30, c → 30 + (30/70)*30
    expect(byId.b).toBeCloseTo(40 + (40 / 70) * 30, 6);
    expect(byId.c).toBeCloseTo(30 + (30 / 70) * 30, 6);
  });

  it('returns no sibling updates when the deleted row was in even-split mode', () => {
    const self = makeAssignment({ id: 'a', share_percentage: null });
    const cohort = [
      self,
      makeAssignment({ id: 'b', share_percentage: null }),
    ];

    const plan = planAssignmentDelete('a', self, cohort);

    expect(plan).not.toBeNull();
    expect(plan!.siblingUpdates).toEqual([]);
  });

  it('bails when the row is already soft-deleted', () => {
    const self = makeAssignment({
      id: 'a',
      share_percentage: 30,
      deleted_at: 12345,
    });
    const cohort = [makeAssignment({ id: 'b', share_percentage: 70 })];

    expect(planAssignmentDelete('a', self, cohort)).toBeNull();
  });

  it('bails when the row is missing', () => {
    expect(planAssignmentDelete('missing', undefined, [])).toBeNull();
  });

  it('unlocks all-locked siblings and even-splits when nothing else can absorb', () => {
    const self = makeAssignment({ id: 'a', share_percentage: 40 });
    const cohort = [
      self,
      makeAssignment({ id: 'b', share_percentage: 30, locked: true }),
      makeAssignment({ id: 'c', share_percentage: 30, locked: true }),
    ];

    const plan = planAssignmentDelete('a', self, cohort);

    expect(plan).not.toBeNull();
    expect(plan!.siblingUpdates).toHaveLength(2);
    for (const update of plan!.siblingUpdates) {
      expect(update.share_percentage).toBeCloseTo(50, 6);
      expect(update.locked).toBe(false);
    }
  });
});

describe('wouldExceedShareLimit', () => {
  it('allows a candidate when the cohort is empty', () => {
    expect(wouldExceedShareLimit([], 50)).toBe(false);
  });

  it('allows a candidate that lands exactly on the 100% boundary', () => {
    const cohort = [makeAssignment({ id: 'a', share_percentage: 50 })];
    expect(wouldExceedShareLimit(cohort, 50)).toBe(false);
  });

  it('rejects when cohort + candidate would exceed 100', () => {
    const cohort = [makeAssignment({ id: 'a', share_percentage: 60 })];
    expect(wouldExceedShareLimit(cohort, 50)).toBe(true);
  });

  it('ignores rows with null share_percentage (even-split mode)', () => {
    const cohort = [
      makeAssignment({ id: 'a', share_percentage: null }),
      makeAssignment({ id: 'b', share_percentage: null }),
    ];
    expect(wouldExceedShareLimit(cohort, 50)).toBe(false);
  });

  it('excludes the self row when excludeId is provided (no-op self update)', () => {
    const cohort = [
      makeAssignment({ id: 'self', share_percentage: 30 }),
      makeAssignment({ id: 'other', share_percentage: 70 }),
    ];
    expect(wouldExceedShareLimit(cohort, 30, 'self')).toBe(false);
  });

  it('accepts a tiny float overshoot within the 0.0001 slack', () => {
    const cohort = [makeAssignment({ id: 'a', share_percentage: 50.00005 })];
    expect(wouldExceedShareLimit(cohort, 50.00005)).toBe(false);
  });

  it('rejects when the overshoot exceeds the 0.0001 slack', () => {
    const cohort = [makeAssignment({ id: 'a', share_percentage: 50.0001 })];
    expect(wouldExceedShareLimit(cohort, 50.0001)).toBe(true);
  });
});
