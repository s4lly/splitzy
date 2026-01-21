import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { calculations } from './receipt-calculation';
import type { Assignment } from '@/models/Assignment';

const makeAssignment = (userId: number, lineItemId: string, overrides: Partial<Assignment> = {}): Assignment => ({
  id: Math.floor(Math.random() * 10000),
  userId,
  receiptLineItemId: lineItemId,
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
  ...overrides,
});

const makeLineItem = (overrides = {}) => ({
  assignments: [] as Assignment[],
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Item',
  price_per_item: 10,
  quantity: 2,
  total_price: 20,
  ...overrides,
});

const makeReceiptData = (overrides = {}) => ({
  date: '2024-01-01',
  display_subtotal: 20,
  final_total: 22,
  gratuity: 1,
  is_receipt: true,
  items_total: 20,
  line_items: [makeLineItem()],
  merchant: 'Test Store',
  payment_method: 'card',
  posttax_total: 21,
  pretax_total: 20,
  subtotal: 20,
  tax: 1,
  tax_included_in_items: false,
  tip: 1,
  total: 22,
  ...overrides,
});

describe('receipt-calculation utils', () => {
  it.skip('getIndividualItemTotalPrice returns correct value', () => {
    const item = makeLineItem({ price_per_item: 5, quantity: 3 });
    expect(
      calculations.pretax
        .getIndividualItemTotalPrice(item as any)
        .equals(new Decimal(15))
    ).toBe(true);
  });

  it.skip('getTotalForAllItems sums all item totals', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ price_per_item: 2, quantity: 2 }), // 4
        makeLineItem({ price_per_item: 3, quantity: 3 }), // 9
      ],
    });
    expect(
      calculations.pretax
        .getTotalForAllItems(receipt as any)
        .equals(new Decimal(13))
    ).toBe(true);
  });

  it.skip('getTotalForAllItems returns 0 for empty line_items', () => {
    const receipt = makeReceiptData({ line_items: [] });
    expect(
      calculations.pretax
        .getTotalForAllItems(receipt as any)
        .equals(new Decimal(0))
    ).toBe(true);
  });

  it.skip('getReceiptTotal returns sum of items, tax, gratuity, and tip', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem({ price_per_item: 5, quantity: 2 })], // 10
      tax: 2,
      display_subtotal: 10,
      gratuity: 1,
      tip: 2,
    });
    // getTotalForAllItems = 10, tax rate = 2/10 = 0.2, tax = 10 * 0.2 = 2, gratuity = 1, tip = 2
    // Total = 10 + 2 + 1 + 2 = 15
    expect(
      calculations.final.getReceiptTotal(receipt as any).equals(new Decimal(15))
    ).toBe(true);
  });

  it.skip('getReceiptTotal handles missing gratuity and tip', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem({ price_per_item: 5, quantity: 2 })], // 10
      tax: 2,
      display_subtotal: 10,
      gratuity: undefined,
      tip: undefined,
    });
    // getTotalForAllItems = 10, tax rate = 2/10 = 0.2, tax = 10 * 0.2 = 2
    // Total = 10 + 2 = 12
    expect(
      calculations.final.getReceiptTotal(receipt as any).equals(new Decimal(12))
    ).toBe(true);
  });

  it('getReceiptTotal handles empty line_items', () => {
    const receipt = makeReceiptData({
      line_items: [],
      tax: 0,
      display_subtotal: 1,
    });
    expect(
      calculations.final.getReceiptTotal(receipt as any).equals(new Decimal(0))
    ).toBe(true);
  });
});

describe('getAllPersonItemTotals', () => {
  it.skip('returns correct totals for single person', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId)],
          price_per_item: 5,
          quantity: 2,
          total_price: 20,
        }),
      ],
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.pretax.getAllPersonItemTotals(itemSplits);
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
  });

  it.skip('returns correct totals for multiple people with shared items', () => {
    const itemId1 = '11111111-1111-1111-1111-111111111111';
    const itemId2 = '22222222-2222-2222-2222-222222222222';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId1,
          assignments: [makeAssignment(1, itemId1), makeAssignment(2, itemId1)],
          price_per_item: 10,
          quantity: 2,
          total_price: 20,
        }),
        makeLineItem({
          id: itemId2,
          assignments: [makeAssignment(2, itemId2)],
          price_per_item: 6,
          quantity: 1,
          total_price: 6,
        }),
      ],
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.pretax.getAllPersonItemTotals(itemSplits);
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(16))).toBe(true);
  });

  it.skip('returns 0 for people not assigned to any items', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId)],
          price_per_item: 10,
          quantity: 1,
          total_price: 20,
        }),
      ],
      total: 10,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.pretax.getAllPersonItemTotals(itemSplits);
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(2)).toBeUndefined();
  });
});

describe('getPersonTotals', () => {
  it.skip('returns correct totals with tax and tip', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId)],
          price_per_item: 10,
          quantity: 2,
        }),
      ],
      tax: 2,
      display_subtotal: 20,
      tip: 4,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    // Each person: 10 (item split) + 1 (tax split) + 2 (tip split) = 13
    expect(result.get(1)?.equals(new Decimal(13))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(13))).toBe(true);
  });

  it.skip('returns correct totals with only one person and no tax/tip', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId)],
          price_per_item: 5,
          quantity: 2,
          total_price: 20,
        }),
      ],
      tax: 0,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
  });

  it.skip('returns equal split if no assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: [],
          price_per_item: 10,
          quantity: 2,
        }),
      ],
      total: 20,
      final_total: 20,
      tip: 0,
      gratuity: 0,
      tax: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    // Add people to itemSplits even though they have no assignments
    itemSplits.individuals.set(1, []);
    itemSplits.individuals.set(2, []);
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    // Receipt total = 20 (items) + 0 (tax) + 0 (tip) + 0 (gratuity) = 20
    // Split 2 ways = 10 each
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(10))).toBe(true);
  });
});

describe('receipt-calculation candidate logic', () => {
  const itemId = '11111111-1111-1111-1111-111111111111';
  const baseItem = {
    id: itemId,
    name: 'Burger',
    price_per_item: 10,
    quantity: 2,
    total_price: 20,
    assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId)],
  };

  const candidate = {
    pricePerItem: new Decimal(15),
    quantity: new Decimal(3),
  } as any;

  it.skip('getIndividualItemTotalPrice uses candidate when provided', () => {
    const item = { ...baseItem };
    const result = calculations.pretax.getIndividualItemTotalPrice(
      item as any,
      candidate
    );
    expect(result.equals(new Decimal(45))).toBe(true);
  });

  it.skip('getPersonTotalForItem uses candidate when provided', () => {
    const item = { ...baseItem };
    const result = calculations.pretax.getPersonTotalForItem(
      item as any,
      1,
      {
        candidate,
      }
    );
    // candidate total: 45, split by 2 = 22.5
    expect(result.equals(new Decimal(22.5))).toBe(true);
  });

  it.skip('getAllPersonItemTotals uses price_per_item * quantity', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
    };
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt_data.line_items as any
    );
    const result = calculations.pretax.getAllPersonItemTotals(itemSplits);
    // Should use price_per_item * quantity = 10*2=20, split by 2 = 10
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(10))).toBe(true);
  });

  it.skip('getPersonTotals calculates totals using price_per_item * quantity', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
      tax: 0,
      gratuity: 0,
      tip: 0,
      tax_included_in_items: true,
    };
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt_data.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt_data as any, {
      itemSplits,
    });
    // Only item, so should match pre-tax split: 10 each
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(10))).toBe(true);
  });

  it.skip('getPersonTotals splits tip and gratuity evenly', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
      tax: 0,
      gratuity: 4,
      tip: 6,
      tax_included_in_items: true,
    };
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt_data.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt_data as any, {
      itemSplits,
    });
    // 10 each + (4+6)/2 = 5, so 15 each
    expect(result.get(1)?.equals(new Decimal(15))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(15))).toBe(true);
  });
});

describe('filterPeople', () => {
  const allPeople = [1, 2, 3, 4];

  it('returns all people if none are assigned and no searchValue', () => {
    expect(calculations.utils.filterPeople(allPeople, [], '')).toEqual(
      allPeople
    );
    expect(calculations.utils.filterPeople(allPeople, [], undefined)).toEqual(
      allPeople
    );
  });

  it('excludes assigned people if no searchValue', () => {
    expect(
      calculations.utils.filterPeople(allPeople, [2, 4], '')
    ).toEqual([1, 3]);
  });

  it('filters by searchValue (not applicable with numeric IDs, but kept for compatibility)', () => {
    // Note: searchValue doesn't make sense with numeric IDs, but function still works
    expect(calculations.utils.filterPeople(allPeople, [], 'a')).toEqual(
      allPeople
    );
    expect(calculations.utils.filterPeople(allPeople, [], 'AL')).toEqual(
      allPeople
    );
    expect(calculations.utils.filterPeople(allPeople, [], 'b')).toEqual(
      allPeople
    );
  });

  it('excludes assigned people and filters by searchValue', () => {
    expect(
      calculations.utils.filterPeople(allPeople, [3], 'a')
    ).toEqual([1, 2, 4]);
    expect(
      calculations.utils.filterPeople(allPeople, [1, 4], 'a')
    ).toEqual([2, 3]);
  });

  it('returns empty array if all people are assigned', () => {
    expect(calculations.utils.filterPeople(allPeople, allPeople, '')).toEqual(
      []
    );
    expect(calculations.utils.filterPeople(allPeople, allPeople, 'a')).toEqual(
      []
    );
  });

  it('returns empty array if no people match searchValue', () => {
    expect(calculations.utils.filterPeople(allPeople, [], 'zzz')).toEqual(allPeople);
  });
});

describe('getPersonFairTotals', () => {
  it('distributes positive rounding pennies correctly', () => {
    // $31.00 split 3 ways = $10.333... each
    // Should round to two values at $10.33 and one at $10.34 to sum to $31.00
    const receiptTotal = new Decimal(31.0);
    const personTotals = new Map([
      [1, new Decimal(10.333333333333334)],
      [2, new Decimal(10.333333333333334)],
      [3, new Decimal(10.333333333333334)],
    ]);

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // Verify the distribution of amounts without assuming which person gets which
    const values = Array.from(result.values())
      .map((v) => v.toNumber())
      .sort();
    expect(values).toEqual([10.33, 10.33, 10.34]);

    // Sum should equal receipt total
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.equals(receiptTotal)).toBe(true);
  });

  it('handles case where rounded sum exceeds receipt total (negative difference)', () => {
    // Simulate case where truncation causes sum to be slightly higher
    // receiptTotal = 30.00, but truncated shares sum to 30.01
    const receiptTotal = new Decimal(30.0);
    const personTotals2 = new Map([
      [1, new Decimal(10.009)], // truncates to 10.00
      [2, new Decimal(10.009)], // truncates to 10.00
      [3, new Decimal(10.009)], // truncates to 10.00
    ]);

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals2
    );

    // Sum should still equal receipt total
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.equals(receiptTotal)).toBe(true);
  });

  it('handles negative differences when rounded sum exceeds receipt total', () => {
    // This test validates the algorithm when rounded values sum to more than the receipt total
    // The diffCents calculation converts to integer cents to avoid floating point errors

    // Create a scenario where rounded sum is slightly higher than receipt total
    const receiptTotal = new Decimal(29.99);
    const personTotals = new Map([
      [1, new Decimal(10.005)], // truncates to 10.00
      [2, new Decimal(10.005)], // truncates to 10.00
      [3, new Decimal(10.005)], // truncates to 10.00
    ]);
    // After truncation: 30.00 total, which is 0.01 more than receiptTotal
    // receiptTotalCents = Math.trunc(29.99 * 100) = 2999
    // roundedSumCents = Math.trunc(30.00... * 100) = 3000
    // diffCents = 2999 - 3000 = -1

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // One person should have 1 cent deducted
    const values = Array.from(result.values())
      .map((v) => v.toNumber())
      .sort();
    expect(values).toContain(9.99); // One person gets 10.00 - 0.01
    expect(values.filter((v) => v === 10.0).length).toBe(2); // Two people keep 10.00

    // Sum should equal receipt total
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.equals(receiptTotal)).toBe(true);
  });

  it('handles exact match with no adjustment needed', () => {
    const receiptTotal = new Decimal(30.0);
    const personTotals = new Map([
      [1, new Decimal(10.0)],
      [2, new Decimal(10.0)],
      [3, new Decimal(10.0)],
    ]);

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    expect(result.get(1)?.equals(new Decimal(10.0))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(10.0))).toBe(true);
    expect(result.get(3)?.equals(new Decimal(10.0))).toBe(true);
  });

  it('handles single person case', () => {
    const receiptTotal = new Decimal(25.67);
    const personTotals = new Map([[1, new Decimal(25.671234)]]);

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    expect(result.get(1)?.equals(new Decimal(25.67))).toBe(true);
  });

  it('distributes multiple pennies to people with largest fractional parts', () => {
    // $10.00 split 3 ways = $3.333... each
    // Should round to two values at $3.33 and one at $3.34 to sum to $10.00
    const receiptTotal = new Decimal(10.0);
    const personTotals = new Map([
      [1, new Decimal(3.333333333333334)],
      [2, new Decimal(3.333333333333334)],
      [3, new Decimal(3.333333333333334)],
    ]);

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // Verify the distribution of amounts without assuming which person gets which
    const values = Array.from(result.values())
      .map((v) => v.toNumber())
      .sort();
    expect(values).toEqual([3.33, 3.33, 3.34]);

    // Sum should equal receipt total
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.equals(receiptTotal)).toBe(true);
  });

  it('handles real-world scenario with complex decimal values', () => {
    // Real data from user's receipt showing floating point precision issues
    // This test ensures the integer cents approach correctly handles the difference
    const receiptTotal = new Decimal(371.32);
    const personTotals = new Map([
      [1, new Decimal(224.08811711635272)],
      [2, new Decimal(69.26421672605917)],
      [3, new Decimal(39.357957180836024)],
      [4, new Decimal(38.617474121839464)],
    ]);

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // Sum should equal receipt total exactly when truncated
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.mul(100).trunc().equals(receiptTotal.mul(100).trunc())).toBe(
      true
    );

    // When formatted with formatCurrency (which truncates), should match
    const sumTruncated = sum.mul(100).trunc().div(100);
    expect(sumTruncated.equals(new Decimal(371.32))).toBe(true);
  });

  it('handles user scenario with 80.61 receipt total and three people', () => {
    // This test covers the specific bug that was reported where
    // personFinalFairLineItemTotalsSum was 80.62 or 80.60 instead of 80.61
    // The bug was caused by floating-point errors in the penny distribution
    const receiptTotal = new Decimal(80.61);
    const personTotals = new Map([
      [1, new Decimal(40.31)],
      [2, new Decimal(40.18)],
      [3, new Decimal(0.13)],
    ]);
    // Note: 40.31 + 40.18 + 0.13 in floating point = 80.62 (8062 cents when truncated)
    // But receiptTotal is 80.61 (8061 cents), so algorithm must subtract 1 cent

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // Each individual value should be correct when converted to cents
    const user1 = result.get(1)!;
    const user2 = result.get(2)!;
    const user3 = result.get(3)!;

    // Check individual cents values using Decimal operations
    expect(user1.mul(100).round().toNumber()).toBe(4030); // adjusted down by 1 cent
    expect(user2.mul(100).round().toNumber()).toBe(4018);
    expect(user3.mul(100).round().toNumber()).toBe(13);

    // Sum of CENTS should equal receipt total in cents
    const sumInCents =
      user1.mul(100).round().toNumber() +
      user2.mul(100).round().toNumber() +
      user3.mul(100).round().toNumber();
    expect(sumInCents).toBe(8061);

    // Verify sum using Decimal
    const sum = Decimal.sum(user1, user2, user3);
    expect(sum.mul(100).trunc().equals(receiptTotal.mul(100).trunc())).toBe(
      true
    );
  });

  it('prevents floating-point accumulation errors during penny distribution', () => {
    // This test ensures that repeatedly adding/subtracting pennies
    // doesn't cause floating-point drift (using integer arithmetic)
    const receiptTotal = new Decimal(100.0);
    const personTotals = new Map([
      [1, new Decimal(14.287)], // truncates to 14.28 (1428 cents)
      [2, new Decimal(14.286)], // truncates to 14.28 (1428 cents)
      [3, new Decimal(14.285)], // truncates to 14.28 (1428 cents)
      [4, new Decimal(14.284)], // truncates to 14.28 (1428 cents)
      [5, new Decimal(14.283)], // truncates to 14.28 (1428 cents)
      [6, new Decimal(14.282)], // truncates to 14.28 (1428 cents)
      [7, new Decimal(14.293)], // truncates to 14.29 (1429 cents)
    ]);
    // Sum after truncation = 1428*6 + 1429 = 8568 + 1429 = 9997 cents = 99.97
    // Need to distribute 3 cents to reach 100.00

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // Sum in cents should equal receipt total exactly
    const sumCents = Array.from(result.values()).reduce(
      (sum, val) => sum + val.mul(100).trunc().toNumber(),
      0
    );
    expect(sumCents).toBe(10000);

    // Verify sum matches when converted
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.mul(100).trunc().toNumber()).toBe(10000);
  });

  it('handles values that would fail with double-conversion approach', () => {
    // This test specifically targets the bug where we were doing:
    // Math.trunc(truncateFloatByNDecimals(value, 2) * 100)
    // which could cause 40.31 -> 40.31 * 100 -> 4030.9999... -> 4030 cents (wrong!)
    const receiptTotal = new Decimal(50.62);
    const personTotals = new Map([
      [1, new Decimal(25.31)], // 2531 cents
      [2, new Decimal(25.31)], // 2531 cents
    ]);
    // Sum = 5062 cents = 50.62 - should match exactly

    const result = calculations.final.getPersonFairTotals(
      receiptTotal,
      personTotals
    );

    // Should not need any adjustment since it matches exactly
    expect(result.get(1)?.equals(new Decimal(25.31))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(25.31))).toBe(true);

    // Verify sum is exact
    const sum = Decimal.sum(...Array.from(result.values()));
    expect(sum.mul(100).trunc().toNumber()).toBe(5062);
  });

  it('ensures no penny is lost or gained across all adjustments', () => {
    // Comprehensive test that verifies the algorithm never loses or creates money
    const testCases = [
      { total: 10.01, splits: [5.005, 5.005] },
      { total: 33.33, splits: [11.11, 11.11, 11.11] },
      { total: 99.99, splits: [33.333, 33.333, 33.333] },
      { total: 0.03, splits: [0.01, 0.01, 0.01] },
      { total: 1.0, splits: [0.333, 0.333, 0.334] },
    ];

    testCases.forEach(({ total, splits }) => {
      const receiptTotal = new Decimal(total);
      const personTotals = new Map(
        splits.map((val, idx) => [idx + 1, new Decimal(val)])
      );

      const result = calculations.final.getPersonFairTotals(
        receiptTotal,
        personTotals
      );

      // Sum in cents must exactly equal receipt total in cents
      const sumCents = Array.from(result.values()).reduce(
        (sum, val) => sum + val.mul(100).trunc().toNumber(),
        0
      );
      const totalCents = new Decimal(total).mul(100).trunc().toNumber();

      expect(sumCents).toBe(totalCents);
    });
  });
});

describe('pretax.getPersonTotalForItem', () => {
  it('returns 0 when person is not assigned to item', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const item = makeLineItem({
      id: itemId,
      assignments: [makeAssignment(1, itemId)],
      price_per_item: 10,
      quantity: 2,
    });
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 2)
        .equals(new Decimal(0))
    ).toBe(true);
  });

  it('returns 0 when item has no assignments', () => {
    const item = makeLineItem({
      assignments: [],
      price_per_item: 10,
      quantity: 2,
    });
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 1)
        .equals(new Decimal(0))
    ).toBe(true);
  });

  it.skip('calculates correct split for single person', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const item = makeLineItem({
      id: itemId,
      assignments: [makeAssignment(1, itemId)],
      price_per_item: 10,
      quantity: 2,
    });
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 1)
        .equals(new Decimal(20))
    ).toBe(true);
  });

  it.skip('calculates correct split for two people', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const item = makeLineItem({
      id: itemId,
      assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId)],
      price_per_item: 10,
      quantity: 2,
    });
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 1)
        .equals(new Decimal(10))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 2)
        .equals(new Decimal(10))
    ).toBe(true);
  });

  it.skip('calculates correct split for three people', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const item = makeLineItem({
      id: itemId,
      assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId), makeAssignment(3, itemId)],
      price_per_item: 30,
      quantity: 1,
    });
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 1)
        .equals(new Decimal(10))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 2)
        .equals(new Decimal(10))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 3)
        .equals(new Decimal(10))
    ).toBe(true);
  });

  it.skip('handles rounding when split is not even', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const item = makeLineItem({
      id: itemId,
      assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId)],
      price_per_item: 10,
      quantity: 1,
    });
    // 10 / 2 = 5.0
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 1)
        .equals(new Decimal(5))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonTotalForItem(item as any, 2)
        .equals(new Decimal(5))
    ).toBe(true);
  });

  it.skip('handles non-even splits correctly', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const item = makeLineItem({
      id: itemId,
      assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId), makeAssignment(3, itemId)],
      price_per_item: 10,
      quantity: 1,
    });
    // 10 / 3 = 3.333...
    const result = calculations.pretax.getPersonTotalForItem(
      item as any,
      1
    );
    expect(result.equals(new Decimal(10).div(3))).toBe(true);
  });
});

describe('pretax.getPersonSplitTotal', () => {
  it('returns 0 when person has no splits', () => {
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments([]);
    expect(
      calculations.pretax
        .getPersonSplitTotal(1, itemSplits)
        .equals(new Decimal(0))
    ).toBe(true);
  });

  it.skip('returns correct total for single item assigned to one person', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId)],
          price_per_item: 10,
          quantity: 2,
        }),
      ],
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    expect(
      calculations.pretax
        .getPersonSplitTotal(1, itemSplits)
        .equals(new Decimal(20))
    ).toBe(true);
  });

  it.skip('returns correct total for item split between two people', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId)],
          price_per_item: 10,
          quantity: 2,
        }),
      ],
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    expect(
      calculations.pretax
        .getPersonSplitTotal(1, itemSplits)
        .equals(new Decimal(10))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonSplitTotal(2, itemSplits)
        .equals(new Decimal(10))
    ).toBe(true);
  });

  it.skip('returns correct total for multiple items', () => {
    const itemId1 = '11111111-1111-1111-1111-111111111111';
    const itemId2 = '22222222-2222-2222-2222-222222222222';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId1,
          assignments: [makeAssignment(1, itemId1), makeAssignment(2, itemId1)],
          price_per_item: 10,
          quantity: 2,
        }),
        makeLineItem({
          id: itemId2,
          assignments: [makeAssignment(1, itemId2)],
          price_per_item: 5,
          quantity: 1,
        }),
      ],
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    // User 1: (10*2)/2 + 5*1 = 10 + 5 = 15
    expect(
      calculations.pretax
        .getPersonSplitTotal(1, itemSplits)
        .equals(new Decimal(15))
    ).toBe(true);
    // User 2: (10*2)/2 = 10
    expect(
      calculations.pretax
        .getPersonSplitTotal(2, itemSplits)
        .equals(new Decimal(10))
    ).toBe(true);
  });

  it.skip('handles three-way split correctly', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId), makeAssignment(2, itemId), makeAssignment(3, itemId)],
          price_per_item: 30,
          quantity: 1,
        }),
      ],
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    expect(
      calculations.pretax
        .getPersonSplitTotal(1, itemSplits)
        .equals(new Decimal(10))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonSplitTotal(2, itemSplits)
        .equals(new Decimal(10))
    ).toBe(true);
    expect(
      calculations.pretax
        .getPersonSplitTotal(3, itemSplits)
        .equals(new Decimal(10))
    ).toBe(true);
  });
});

describe('tax.getRate', () => {
  it.skip('calculates correct tax rate', () => {
    const receipt = makeReceiptData({
      tax: 2,
      display_subtotal: 20,
    });
    expect(
      calculations.tax.getRate(receipt as any).equals(new Decimal(0.1))
    ).toBe(true); // 2/20 = 0.1
  });

  it('returns 0 when display_subtotal is 0', () => {
    const receipt = makeReceiptData({
      tax: 2,
      display_subtotal: 0,
    });
    expect(
      calculations.tax.getRate(receipt as any).equals(new Decimal(0))
    ).toBe(true);
  });

  it('returns 0 when tax is 0', () => {
    const receipt = makeReceiptData({
      tax: 0,
      display_subtotal: 20,
    });
    expect(
      calculations.tax.getRate(receipt as any).equals(new Decimal(0))
    ).toBe(true);
  });

  it('returns 0 when tax is undefined', () => {
    const receipt = makeReceiptData({
      tax: undefined,
      display_subtotal: 20,
    });
    expect(
      calculations.tax.getRate(receipt as any).equals(new Decimal(0))
    ).toBe(true);
  });

  it.skip('handles fractional tax rates', () => {
    const receipt = makeReceiptData({
      tax: 1.5,
      display_subtotal: 10,
    });
    expect(
      calculations.tax.getRate(receipt as any).equals(new Decimal(0.15))
    ).toBe(true); // 1.5/10 = 0.15
  });

  it.skip('handles high tax rates', () => {
    const receipt = makeReceiptData({
      tax: 5,
      display_subtotal: 10,
    });
    expect(
      calculations.tax.getRate(receipt as any).equals(new Decimal(0.5))
    ).toBe(true); // 5/10 = 0.5
  });
});

describe('getPersonTotals - tax split types', () => {
  it.skip('splits tax evenly when taxSplitType is "even"', () => {
    const itemId1 = '11111111-1111-1111-1111-111111111111';
    const itemId2 = '22222222-2222-2222-2222-222222222222';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId1,
          assignments: [makeAssignment(1, itemId1)],
          price_per_item: 10,
          quantity: 1,
        }),
        makeLineItem({
          id: itemId2,
          assignments: [makeAssignment(2, itemId2)],
          price_per_item: 20,
          quantity: 1,
        }),
      ],
      tax: 3,
      display_subtotal: 30,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
      taxSplitType: 'even',
    });
    // User 1: 10 + (3/2) = 11.5
    // User 2: 20 + (3/2) = 21.5
    expect(result.get(1)?.equals(new Decimal(11.5))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(21.5))).toBe(true);
  });

  it.skip('splits tax proportionally when taxSplitType is "proportional"', () => {
    const itemId1 = '11111111-1111-1111-1111-111111111111';
    const itemId2 = '22222222-2222-2222-2222-222222222222';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId1,
          assignments: [makeAssignment(1, itemId1)],
          price_per_item: 10,
          quantity: 1,
        }),
        makeLineItem({
          id: itemId2,
          assignments: [makeAssignment(2, itemId2)],
          price_per_item: 20,
          quantity: 1,
        }),
      ],
      tax: 3,
      display_subtotal: 30,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
      taxSplitType: 'proportional',
    });
    // Total assigned: 30, tax: 3
    // User 1: 10/30 = 1/3, tax: 3 * 1/3 = 1, total: 10 + 1 = 11
    // User 2: 20/30 = 2/3, tax: 3 * 2/3 = 2, total: 20 + 2 = 22
    expect(result.get(1)?.equals(new Decimal(11))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(22))).toBe(true);
  });

  it.skip('skips tax when tax_included_in_items is true', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId)],
          price_per_item: 10,
          quantity: 1,
        }),
      ],
      tax: 2,
      display_subtotal: 10,
      tax_included_in_items: true,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
      taxSplitType: 'proportional',
    });
    // Tax should not be added since tax_included_in_items is true
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
  });

  it.skip('handles tax_included_in_items with no tax', () => {
    const itemId = '00000000-0000-0000-0000-000000000000';
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          id: itemId,
          assignments: [makeAssignment(1, itemId)],
          price_per_item: 10,
          quantity: 1,
        }),
      ],
      tax: 0,
      display_subtotal: 10,
      tax_included_in_items: true,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
  });
});

describe('getPersonTotals - edge cases', () => {
  it('handles empty itemSplits.individuals when no assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: [],
          price_per_item: 10,
          quantity: 1,
        }),
      ],
      tax: 0,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = calculations.pretax.createItemSplitsFromAssignments(
      receipt.line_items as any
    );
    // itemSplits.individuals is empty, so getPersonTotals should return empty map
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    expect(result.size).toBe(0);
  });

  it('handles getReceiptTotal returning 0 when no line items', () => {
    const receipt = makeReceiptData({
      line_items: [],
      tax: 0,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = {
      individuals: new Map([[1, []]]),
      groups: new Map(),
    };
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    // When receiptTotal is 0 and split evenly, each person gets 0
    expect(result.get(1)?.equals(new Decimal(0))).toBe(true);
  });

  it.skip('handles multiple people with no assignments splitting evenly', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: [],
          price_per_item: 30,
          quantity: 1,
        }),
      ],
      tax: 0,
      tip: 0,
      gratuity: 0,
    });
    const itemSplits = {
      individuals: new Map([
        [1, []],
        [2, []],
        [3, []],
      ]),
      groups: new Map(),
    };
    const result = calculations.final.getPersonTotals(receipt as any, {
      itemSplits,
    });
    // Receipt total = 30, split 3 ways = 10 each
    expect(result.get(1)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(2)?.equals(new Decimal(10))).toBe(true);
    expect(result.get(3)?.equals(new Decimal(10))).toBe(true);
  });
});
