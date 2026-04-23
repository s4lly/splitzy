import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import {
  evenShares,
  largestRemainderRound,
  rebalance,
  type ShareEntry,
} from './split-percent';

const d = (value: number | string) => new Decimal(value);

const makeEntry = (
  id: string,
  share: number | string,
  locked = false
): ShareEntry => ({ id, share: d(share), locked });

const sumShares = (entries: ShareEntry[]): Decimal =>
  entries.reduce((sum, entry) => sum.plus(entry.share), new Decimal(0));

describe('largestRemainderRound', () => {
  it('returns [] for empty input', () => {
    expect(largestRemainderRound([])).toEqual([]);
  });

  it('rounds three equal thirds to sum to 100', () => {
    const result = largestRemainderRound([
      d(100).div(3),
      d(100).div(3),
      d(100).div(3),
    ]);

    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(result).toEqual([34, 33, 33]);
  });

  it('leaves already-integer shares unchanged', () => {
    expect(largestRemainderRound([d(50), d(50)])).toEqual([50, 50]);
    expect(largestRemainderRound([d(25), d(25), d(25), d(25)])).toEqual([
      25, 25, 25, 25,
    ]);
  });

  it('preserves input order when distributing the deficit', () => {
    // Floors → [33, 33, 33] (sum 99), deficit 1 → first entry has largest
    // fractional remainder so it should receive the extra percent.
    const result = largestRemainderRound([d('33.5'), d('33.3'), d('33.2')]);

    expect(result).toEqual([34, 33, 33]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});

describe('evenShares', () => {
  it('returns 0 for zero or negative counts', () => {
    expect(evenShares(0).toNumber()).toBe(0);
    expect(evenShares(-5).toNumber()).toBe(0);
  });

  it('returns 100/count as a Decimal', () => {
    expect(evenShares(4).toNumber()).toBe(25);
    expect(evenShares(3).toFixed(4)).toBe(new Decimal(100).div(3).toFixed(4));
  });
});

describe('rebalance', () => {
  it('returns input unchanged when targetId is unknown', () => {
    const entries = [makeEntry('a', 50), makeEntry('b', 50)];

    expect(rebalance(entries, 'missing', d(80))).toBe(entries);
  });

  it('returns input unchanged when target is locked', () => {
    const entries = [makeEntry('a', 50, true), makeEntry('b', 50)];

    expect(rebalance(entries, 'a', d(80))).toBe(entries);
  });

  it('scales unlocked siblings proportionally', () => {
    const entries = [makeEntry('a', 50), makeEntry('b', 50)];
    const next = rebalance(entries, 'a', d(80));

    expect(next.find((entry) => entry.id === 'a')?.share.toNumber()).toBe(80);
    expect(next.find((entry) => entry.id === 'b')?.share.toNumber()).toBe(20);
    expect(sumShares(next).toNumber()).toBe(100);
  });

  it('preserves locked shares and splits remainder among unlocked', () => {
    const entries = [
      makeEntry('a', 40, true),
      makeEntry('b', 30),
      makeEntry('c', 30),
    ];
    const next = rebalance(entries, 'b', d(50));

    expect(next.find((entry) => entry.id === 'a')?.share.toNumber()).toBe(40);
    expect(next.find((entry) => entry.id === 'b')?.share.toNumber()).toBe(50);
    expect(next.find((entry) => entry.id === 'c')?.share.toNumber()).toBe(10);
    expect(sumShares(next).toNumber()).toBe(100);
  });

  it('clamps target to 100 - lockedSum when request exceeds the budget', () => {
    const entries = [
      makeEntry('a', 40, true),
      makeEntry('b', 30),
      makeEntry('c', 30),
    ];
    const next = rebalance(entries, 'b', d(90));

    expect(next.find((entry) => entry.id === 'b')?.share.toNumber()).toBe(60);
    expect(next.find((entry) => entry.id === 'c')?.share.toNumber()).toBe(0);
    expect(next.find((entry) => entry.id === 'a')?.share.toNumber()).toBe(40);
    expect(sumShares(next).toNumber()).toBe(100);
  });

  it('splits remainder evenly when siblings sum to zero', () => {
    const entries = [makeEntry('a', 100), makeEntry('b', 0), makeEntry('c', 0)];
    const next = rebalance(entries, 'a', d(40));

    expect(next.find((entry) => entry.id === 'a')?.share.toNumber()).toBe(40);
    expect(next.find((entry) => entry.id === 'b')?.share.toNumber()).toBe(30);
    expect(next.find((entry) => entry.id === 'c')?.share.toNumber()).toBe(30);
    expect(sumShares(next).toNumber()).toBe(100);
  });

  it('clamps negative requests to zero', () => {
    const entries = [makeEntry('a', 50), makeEntry('b', 50)];
    const next = rebalance(entries, 'a', d(-20));

    expect(next.find((entry) => entry.id === 'a')?.share.toNumber()).toBe(0);
    expect(next.find((entry) => entry.id === 'b')?.share.toNumber()).toBe(100);
  });
});
