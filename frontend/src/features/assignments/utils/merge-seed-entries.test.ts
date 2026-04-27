import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { mergeSeedEntries } from '@/features/assignments/utils/merge-seed-entries';

const d = (value: number | string) => new Decimal(value);

type Entry = {
  id: string;
  share: Decimal;
  locked: boolean;
  displayName: string;
  receiptUserId: string;
};

const make = (
  id: string,
  share: number | string,
  locked = false,
  displayName = `name-${id}`,
  receiptUserId = `ru-${id}`
): Entry => ({ id, share: d(share), locked, displayName, receiptUserId });

describe('mergeSeedEntries', () => {
  it('returns prev reference when seed is structurally identical', () => {
    const prev = [make('a', 50), make('b', 50)];
    const seed = [make('a', 50), make('b', 50)];
    const result = mergeSeedEntries(prev, seed, new Set());
    expect(result).toBe(prev);
  });

  it('returns prev reference for Decimal values that are equal but not reference-identical', () => {
    const prev = [
      make('a', '33.3333'),
      make('b', '33.3333'),
      make('c', '33.3334'),
    ];
    const seed = [
      make('a', '33.3333'),
      make('b', '33.3333'),
      make('c', '33.3334'),
    ];
    const result = mergeSeedEntries(prev, seed, new Set());
    expect(result).toBe(prev);
  });

  it('keeps prev entry for rows in pendingIds and takes seed for siblings', () => {
    const prev = [make('a', 80), make('b', 10), make('c', 10)];
    // Seed reflects what has been persisted so far — row a echoed back at 50,
    // sibling rows redistributed.
    const seed = [make('a', 50), make('b', 25), make('c', 25)];
    const result = mergeSeedEntries(prev, seed, new Set(['a']));
    expect(result).not.toBe(prev);
    expect(result[0].share.toNumber()).toBe(80); // kept from prev
    expect(result[1].share.toNumber()).toBe(25); // taken from seed
    expect(result[2].share.toNumber()).toBe(25); // taken from seed
  });

  it('drops rows that are no longer in seed', () => {
    const prev = [make('a', 50), make('b', 50)];
    const seed = [make('a', 100)];
    const result = mergeSeedEntries(prev, seed, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('adds new rows that appear in seed', () => {
    const prev = [make('a', 100)];
    const seed = [make('a', 50), make('b', 50)];
    const result = mergeSeedEntries(prev, seed, new Set());
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('applies lock toggles from seed when row is not pending', () => {
    const prev = [make('a', 50, false), make('b', 50, false)];
    const seed = [make('a', 50, true), make('b', 50, false)];
    const result = mergeSeedEntries(prev, seed, new Set());
    expect(result).not.toBe(prev);
    expect(result[0].locked).toBe(true);
  });

  it('preserves prev lock state for pending rows even if seed differs', () => {
    const prev = [make('a', 50, false)];
    const seed = [make('a', 50, true)];
    const result = mergeSeedEntries(prev, seed, new Set(['a']));
    expect(result[0].locked).toBe(false);
  });

  it('detects displayName change as a difference', () => {
    const prev = [make('a', 50, false, 'Old Name')];
    const seed = [make('a', 50, false, 'New Name')];
    const result = mergeSeedEntries(prev, seed, new Set());
    expect(result).not.toBe(prev);
    expect(result[0].displayName).toBe('New Name');
  });

  it('handles empty prev and empty seed', () => {
    const prev: Entry[] = [];
    const seed: Entry[] = [];
    expect(mergeSeedEntries(prev, seed, new Set())).toBe(prev);
  });

  it('handles pending id that no longer exists in seed (silently dropped)', () => {
    const prev = [make('a', 50), make('b', 50)];
    const seed = [make('a', 100)];
    const result = mergeSeedEntries(prev, seed, new Set(['b']));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});
