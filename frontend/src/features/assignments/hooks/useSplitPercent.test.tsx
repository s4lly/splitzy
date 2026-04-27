import { act, renderHook } from '@testing-library/react';
import Decimal from 'decimal.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSplitPercent } from '@/features/assignments/hooks/useSplitPercent';
import type { Assignment } from '@/models/Assignment';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

const mutateMock = vi.fn(
  (_descriptor: { kind: string; args: { id: string } }) => Promise.resolve()
);

vi.mock('@rocicorp/zero/react', () => ({
  useZero: () => ({ mutate: mutateMock }),
}));

vi.mock('@splitzy/shared-zero/mutators', () => ({
  mutators: {
    assignments: {
      update: (args: unknown) => ({ kind: 'assignments.update', args }),
    },
  },
}));

const makeAssignment = (
  id: string,
  share: number | string | null,
  locked = false
): Assignment => ({
  id,
  receiptUserId: `ru-${id}`,
  receiptLineItemId: 'line-1',
  createdAt: new Date('2026-01-01'),
  deletedAt: null,
  receiptUser: {
    id: `ru-${id}`,
    userId: null,
    displayName: `Person ${id}`,
    createdAt: new Date('2026-01-01'),
    deletedAt: null,
    user: null,
  } as Assignment['receiptUser'],
  sharePercentage: share == null ? null : new Decimal(share),
  locked,
});

const makeItem = (assignments: Assignment[]): ReceiptLineItem => ({
  id: 'line-1',
  name: 'Coffee',
  quantity: new Decimal(1),
  pricePerItem: new Decimal(10),
  totalPrice: new Decimal(10),
  deletedAt: null,
  assignments,
});

describe('useSplitPercent — re-seed behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mutateMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('preserves in-flight local share when an echo arrives mid-drag (snap-back regression)', () => {
    const initial = makeItem([
      makeAssignment('a', 50),
      makeAssignment('b', 50),
    ]);

    const { result, rerender } = renderHook(
      ({ item }: { item: ReceiptLineItem }) => useSplitPercent({ item }),
      { initialProps: { item: initial } }
    );

    // User drags row 'a' to 80 — sibling 'b' rebalances to 20.
    act(() => {
      result.current.handleChange('a', new Decimal(80));
    });
    expect(
      result.current.entries.find((e) => e.id === 'a')?.share.toNumber()
    ).toBe(80);

    // Before debounce fires (150ms), an echo arrives carrying older persisted
    // values. seedKey changes (b's share echoed as something different) but
    // the drag is still in flight on row 'a'.
    const echoed = makeItem([
      makeAssignment('a', 50), // stale — what the persisted side currently shows
      makeAssignment('b', 50),
    ]);
    act(() => {
      rerender({ item: echoed });
    });

    // Local 'a' must NOT have snapped back to 50.
    expect(
      result.current.entries.find((e) => e.id === 'a')?.share.toNumber()
    ).toBe(80);
  });

  it('takes seed values for rows with no pending timer', () => {
    const initial = makeItem([
      makeAssignment('a', 50),
      makeAssignment('b', 50),
    ]);

    const { result, rerender } = renderHook(
      ({ item }: { item: ReceiptLineItem }) => useSplitPercent({ item }),
      { initialProps: { item: initial } }
    );

    // Let any initial debounces drain (none expected, but be safe).
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // No drag in progress. A remote update arrives for row 'b'.
    const updated = makeItem([
      makeAssignment('a', 50),
      makeAssignment('b', 30),
    ]);
    act(() => {
      rerender({ item: updated });
    });

    expect(
      result.current.entries.find((e) => e.id === 'b')?.share.toNumber()
    ).toBe(30);
  });

  it('cancels pending timer for a row that disappears from seed', () => {
    const initial = makeItem([
      makeAssignment('a', 50),
      makeAssignment('b', 50),
    ]);

    const { result, rerender } = renderHook(
      ({ item }: { item: ReceiptLineItem }) => useSplitPercent({ item }),
      { initialProps: { item: initial } }
    );

    // Drag row 'a' to schedule a debounced persist.
    act(() => {
      result.current.handleChange('a', new Decimal(70));
    });

    // Before the debounce fires, row 'a' is removed remotely.
    const removed = makeItem([makeAssignment('b', 100)]);
    act(() => {
      rerender({ item: removed });
    });

    mutateMock.mockClear();

    // Advance past the debounce window. The cancelled timer must NOT fire a
    // mutate for the removed row.
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const calledForRemovedRow = mutateMock.mock.calls.some(
      (call) => call[0]?.args?.id === 'a'
    );
    expect(calledForRemovedRow).toBe(false);
  });
});
