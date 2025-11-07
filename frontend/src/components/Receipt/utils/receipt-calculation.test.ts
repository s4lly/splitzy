import { describe, expect, it } from 'vitest';
import {
  filterPeople,
  getIndividualItemTotalPrice,
  getPersonFinalFairLineItemTotals,
  getPersonFinalTotals,
  getPersonPreTaxItemTotals,
  getPersonPreTaxTotalForItem,
  getTaxAmount,
  getTotal,
  getTotalForAllItems,
} from './receipt-calculation';

const makeLineItem = (overrides = {}) => ({
  assignments: [],
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
  it('getIndividualItemTotalPrice returns correct value', () => {
    const item = makeLineItem({ price_per_item: 5, quantity: 3 });
    expect(getIndividualItemTotalPrice(item)).toBe(15);
  });

  it('getTotalForAllItems sums all item totals', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ price_per_item: 2, quantity: 2 }), // 4
        makeLineItem({ price_per_item: 3, quantity: 3 }), // 9
      ],
    });
    expect(getTotalForAllItems(receipt)).toBe(13);
  });

  it('getTotalForAllItems returns 0 for empty line_items', () => {
    const receipt = makeReceiptData({ line_items: [] });
    expect(getTotalForAllItems(receipt)).toBe(0);
  });

  it('getTaxAmount returns correct tax for given total and receipt', () => {
    const receipt = makeReceiptData({ tax: 2, display_subtotal: 20 });
    expect(getTaxAmount(10, receipt)).toBeCloseTo(1);
  });

  it('getTaxAmount returns 0 if display_subtotal is 0', () => {
    const receipt = makeReceiptData({ tax: 2, display_subtotal: 0 });
    expect(getTaxAmount(10, receipt)).toBe(0);
  });

  it('getTotal returns sum of items, tax, gratuity, and tip', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem({ price_per_item: 5, quantity: 2 })], // 10
      tax: 2,
      display_subtotal: 10,
      gratuity: 1,
      tip: 2,
    });
    // getTotalForAllItems = 10, getTaxAmount = 2, gratuity = 1, tip = 2
    expect(getTotal(receipt)).toBe(15);
  });

  it('getTotal handles missing gratuity and tip', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem({ price_per_item: 5, quantity: 2 })], // 10
      tax: 2,
      display_subtotal: 10,
      gratuity: undefined,
      tip: undefined,
    });
    expect(getTotal(receipt)).toBe(12);
  });

  it('getTotal handles empty line_items', () => {
    const receipt = makeReceiptData({
      line_items: [],
      tax: 0,
      display_subtotal: 1,
    });
    expect(getTotal(receipt)).toBe(0);
  });
});

describe('getPersonPreTaxItemTotals', () => {
  it('returns correct pre-tax totals for single person', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: ['Alice'],
          price_per_item: 5,
          quantity: 2,
          total_price: 20,
        }),
      ],
    });
    const people = ['Alice'];
    const result = getPersonPreTaxItemTotals(receipt, people);
    expect(result.get('Alice')).toBe(10);
  });

  it('returns correct pre-tax totals for multiple people with shared items', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: ['Alice', 'Bob'],
          price_per_item: 10,
          quantity: 2,
          total_price: 20,
        }),
        makeLineItem({
          assignments: ['Bob'],
          price_per_item: 6,
          quantity: 1,
          total_price: 6,
        }),
      ],
    });
    const people = ['Alice', 'Bob'];
    const result = getPersonPreTaxItemTotals(receipt, people);
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(16);
  });

  it('returns 0 for people not assigned to any items', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: ['Alice'],
          price_per_item: 10,
          quantity: 1,
          total_price: 20,
        }),
      ],
      total: 10,
    });
    const people = ['Alice', 'Bob'];
    const result = getPersonPreTaxItemTotals(receipt, people);
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(0);
  });
});

describe('getPersonFinalTotals', () => {
  it('returns correct final totals with tax and tip', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: ['Alice', 'Bob'],
          price_per_item: 10,
          quantity: 2,
        }),
      ],
      tax: 2,
      display_subtotal: 20,
      tip: 4,
      gratuity: 0,
    });
    const people = ['Alice', 'Bob'];
    const result = getPersonFinalTotals(receipt, people);
    expect(result.get('Alice')).toBeCloseTo(13);
    expect(result.get('Bob')).toBeCloseTo(13);
  });

  it('returns correct final totals with only one person and no tax/tip', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({
          assignments: ['Alice'],
          price_per_item: 5,
          quantity: 2,
          total_price: 20,
        }),
      ],
      tax: 0,
      tip: 0,
      gratuity: 0,
    });
    const people = ['Alice'];
    const result = getPersonFinalTotals(receipt, people);
    expect(result.get('Alice')).toBe(10);
  });

  it('returns equal split if no assignments', () => {
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
    const people = ['Alice', 'Bob'];
    const result = getPersonFinalTotals(receipt, people);
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(10);
  });
});

describe('receipt-calculation candidate logic', () => {
  const baseItem = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Burger',
    price_per_item: 10,
    quantity: 2,
    total_price: 20,
    assignments: ['Alice', 'Bob'],
  };

  const candidate = { price_per_item: 15, quantity: 3 };

  it('getIndividualItemTotalPrice uses candidate when provided', () => {
    const item = { ...baseItem };
    const result = getIndividualItemTotalPrice(item, candidate);
    expect(result).toBe(15 * 3);
  });

  it('getPersonPreTaxTotalForItem uses candidate when provided', () => {
    const item = { ...baseItem };
    const result = getPersonPreTaxTotalForItem(item, 'Alice', {
      candidate,
    });
    // candidate total: 45, split by 2 = 22.5
    expect(result).toBe(22.5);
  });

  it('getPersonPreTaxItemTotals uses price_per_item * quantity', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
    };
    const people = ['Alice', 'Bob'];
    const result = getPersonPreTaxItemTotals(receipt_data as any, people);
    // Should use price_per_item * quantity = 10*2=20, split by 2 = 10
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(10);
  });

  it('getPersonFinalTotals calculates totals using price_per_item * quantity', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
      tax: 0,
      gratuity: 0,
      tip: 0,
      tax_included_in_items: true,
    };
    const people = ['Alice', 'Bob'];
    const result = getPersonFinalTotals(receipt_data as any, people);
    // Only item, so should match pre-tax split: 10 each
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(10);
  });

  it('getPersonFinalTotals splits tip and gratuity evenly', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
      tax: 0,
      gratuity: 4,
      tip: 6,
      tax_included_in_items: true,
    };
    const people = ['Alice', 'Bob'];
    const result = getPersonFinalTotals(receipt_data as any, people);
    // 10 each + (4+6)/2 = 5, so 15 each
    expect(result.get('Alice')).toBe(15);
    expect(result.get('Bob')).toBe(15);
  });
});

describe('filterPeople', () => {
  const allPeople = ['Alice', 'Bob', 'Charlie', 'Dana'];

  it('returns all people if none are assigned and no searchValue', () => {
    expect(filterPeople(allPeople, [], '')).toEqual(allPeople);
    expect(filterPeople(allPeople, [], undefined)).toEqual(allPeople);
  });

  it('excludes assigned people if no searchValue', () => {
    expect(filterPeople(allPeople, ['Bob', 'Dana'], '')).toEqual([
      'Alice',
      'Charlie',
    ]);
  });

  it('filters by searchValue (case-insensitive)', () => {
    expect(filterPeople(allPeople, [], 'a')).toEqual([
      'Alice',
      'Charlie',
      'Dana',
    ]);
    expect(filterPeople(allPeople, [], 'AL')).toEqual(['Alice']);
    expect(filterPeople(allPeople, [], 'b')).toEqual(['Bob']);
  });

  it('excludes assigned people and filters by searchValue', () => {
    expect(filterPeople(allPeople, ['Charlie'], 'a')).toEqual([
      'Alice',
      'Dana',
    ]);
    expect(filterPeople(allPeople, ['Alice', 'Dana'], 'a')).toEqual([
      'Charlie',
    ]);
  });

  it('returns empty array if all people are assigned', () => {
    expect(filterPeople(allPeople, allPeople, '')).toEqual([]);
    expect(filterPeople(allPeople, allPeople, 'a')).toEqual([]);
  });

  it('returns empty array if no people match searchValue', () => {
    expect(filterPeople(allPeople, [], 'zzz')).toEqual([]);
  });
});

describe('getPersonFinalFairLineItemTotals', () => {
  it('distributes positive rounding pennies correctly', () => {
    // $31.00 split 3 ways = $10.333... each
    // Should round to two values at $10.33 and one at $10.34 to sum to $31.00
    const receiptTotal = 31.0;
    const personFinalTotals = new Map([
      ['Alice', 10.333333333333334],
      ['Bob', 10.333333333333334],
      ['Charlie', 10.333333333333334],
    ]);

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // Verify the distribution of amounts without assuming which person gets which
    const values = Array.from(result.values()).sort();
    expect(values).toEqual([10.33, 10.33, 10.34]);

    // Sum should equal receipt total
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(receiptTotal, 2);
  });

  it('handles case where rounded sum exceeds receipt total (negative difference)', () => {
    // Simulate case where truncation causes sum to be slightly higher
    // receiptTotal = 30.00, but truncated shares sum to 30.01
    const receiptTotal = 30.0;
    const personFinalTotals = new Map([
      ['Alice', 10.006], // truncates to 10.00
      ['Bob', 10.006], // truncates to 10.00
      ['Charlie', 10.006], // truncates to 10.00
    ]);
    // Sum after truncation = 30.00, which equals receiptTotal
    // But let's test a case where it would be higher:

    const personFinalTotals2 = new Map([
      ['Alice', 10.009], // truncates to 10.00
      ['Bob', 10.009], // truncates to 10.00
      ['Charlie', 10.009], // truncates to 10.00
    ]);

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals2
    );

    // Sum should still equal receipt total
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(receiptTotal, 2);
  });

  it('handles negative differences when rounded sum exceeds receipt total', () => {
    // This test validates the algorithm when rounded values sum to more than the receipt total
    // The diffCents calculation converts to integer cents to avoid floating point errors

    // Create a scenario where rounded sum is slightly higher than receipt total
    const receiptTotal = 29.99;
    const personFinalTotals = new Map([
      ['Alice', 10.005], // truncates to 10.00
      ['Bob', 10.005], // truncates to 10.00
      ['Charlie', 10.005], // truncates to 10.00
    ]);
    // After truncation: 30.00 total, which is 0.01 more than receiptTotal
    // receiptTotalCents = Math.trunc(29.99 * 100) = 2999
    // roundedSumCents = Math.trunc(30.00... * 100) = 3000
    // diffCents = 2999 - 3000 = -1

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // One person should have 1 cent deducted
    const values = Array.from(result.values()).sort();
    expect(values).toContain(9.99); // One person gets 10.00 - 0.01
    expect(values.filter((v) => v === 10.0).length).toBe(2); // Two people keep 10.00

    // Sum should equal receipt total
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(receiptTotal, 2);
  });

  it('handles exact match with no adjustment needed', () => {
    const receiptTotal = 30.0;
    const personFinalTotals = new Map([
      ['Alice', 10.0],
      ['Bob', 10.0],
      ['Charlie', 10.0],
    ]);

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    expect(result.get('Alice')).toBe(10.0);
    expect(result.get('Bob')).toBe(10.0);
    expect(result.get('Charlie')).toBe(10.0);
  });

  it('handles single person case', () => {
    const receiptTotal = 25.67;
    const personFinalTotals = new Map([['Alice', 25.671234]]);

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    expect(result.get('Alice')).toBe(25.67);
  });

  it('distributes multiple pennies to people with largest fractional parts', () => {
    // $10.00 split 3 ways = $3.333... each
    // Should round to two values at $3.33 and one at $3.34 to sum to $10.00
    const receiptTotal = 10.0;
    const personFinalTotals = new Map([
      ['Alice', 3.333333333333334],
      ['Bob', 3.333333333333334],
      ['Charlie', 3.333333333333334],
    ]);

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // Verify the distribution of amounts without assuming which person gets which
    const values = Array.from(result.values()).sort();
    expect(values).toEqual([3.33, 3.33, 3.34]);

    // Sum should equal receipt total (using toFixed to avoid floating point precision issues)
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(+sum.toFixed(2)).toBe(receiptTotal);
  });

  it('handles real-world scenario with complex decimal values', () => {
    // Real data from user's receipt showing floating point precision issues
    // This test ensures the integer cents approach correctly handles the difference
    const receiptTotal = 371.32;
    const personFinalTotals = new Map([
      ['jill', 224.08811711635272],
      ['bob', 69.26421672605917],
      ['Ben', 39.357957180836024],
      ['jane', 38.617474121839464],
    ]);

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // Sum should equal receipt total exactly when truncated
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(Math.trunc(sum * 100)).toBe(Math.trunc(receiptTotal * 100));

    // When formatted with formatCurrency (which truncates), should match
    const sumTruncated = Math.trunc(sum * 100) / 100;
    expect(sumTruncated).toBe(371.32);
  });

  it('handles user scenario with 80.61 receipt total and three people', () => {
    // This test covers the specific bug that was reported where
    // personFinalFairLineItemTotalsSum was 80.62 or 80.60 instead of 80.61
    // The bug was caused by floating-point errors in the penny distribution
    const receiptTotal = 80.61;
    const personFinalTotals = new Map([
      ['sisilia', 40.31],
      ['jaime', 40.18],
      ['bob', 0.13],
    ]);
    // Note: 40.31 + 40.18 + 0.13 in floating point = 80.62 (8062 cents when truncated)
    // But receiptTotal is 80.61 (8061 cents), so algorithm must subtract 1 cent

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // Each individual value should be correct when converted to cents
    const sisilia = result.get('sisilia')!;
    const jaime = result.get('jaime')!;
    const bob = result.get('bob')!;

    // Check individual cents values using Math.round to handle floating-point precision
    // (e.g., 40.3 * 100 = 4029.9999... which rounds to 4030)
    expect(Math.round(sisilia * 100)).toBe(4030); // adjusted down by 1 cent
    expect(Math.round(jaime * 100)).toBe(4018);
    expect(Math.round(bob * 100)).toBe(13);

    // Sum of CENTS should equal receipt total in cents
    const sumInCents =
      Math.round(sisilia * 100) +
      Math.round(jaime * 100) +
      Math.round(bob * 100);
    expect(sumInCents).toBe(8061);

    // Note: Adding the dollar values will have floating-point error
    // (40.3 + 40.18 + 0.13 = 80.60999999999999)
    // This is handled in the UI by summing the rounded cent values
  });

  it('prevents floating-point accumulation errors during penny distribution', () => {
    // This test ensures that repeatedly adding/subtracting pennies
    // doesn't cause floating-point drift (using integer arithmetic)
    const receiptTotal = 100.0;
    const personFinalTotals = new Map([
      ['person1', 14.287], // truncates to 14.28 (1428 cents)
      ['person2', 14.286], // truncates to 14.28 (1428 cents)
      ['person3', 14.285], // truncates to 14.28 (1428 cents)
      ['person4', 14.284], // truncates to 14.28 (1428 cents)
      ['person5', 14.283], // truncates to 14.28 (1428 cents)
      ['person6', 14.282], // truncates to 14.28 (1428 cents)
      ['person7', 14.293], // truncates to 14.29 (1429 cents)
    ]);
    // Sum after truncation = 1428*6 + 1429 = 8568 + 1429 = 9997 cents = 99.97
    // Need to distribute 3 cents to reach 100.00

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // Sum in cents should equal receipt total exactly
    const sumCents = Array.from(result.values()).reduce(
      (sum, val) => sum + Math.trunc(val * 100),
      0
    );
    expect(sumCents).toBe(10000);

    // Verify sum matches when converted
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(Math.trunc(sum * 100)).toBe(10000);
  });

  it('handles values that would fail with double-conversion approach', () => {
    // This test specifically targets the bug where we were doing:
    // Math.trunc(truncateFloatByNDecimals(value, 2) * 100)
    // which could cause 40.31 -> 40.31 * 100 -> 4030.9999... -> 4030 cents (wrong!)
    const receiptTotal = 50.62;
    const personFinalTotals = new Map([
      ['alice', 25.31], // 2531 cents
      ['bob', 25.31], // 2531 cents
    ]);
    // Sum = 5062 cents = 50.62 - should match exactly

    const result = getPersonFinalFairLineItemTotals(
      receiptTotal,
      personFinalTotals
    );

    // Should not need any adjustment since it matches exactly
    expect(result.get('alice')).toBe(25.31);
    expect(result.get('bob')).toBe(25.31);

    // Verify sum is exact
    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(Math.trunc(sum * 100)).toBe(5062);
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
      const personFinalTotals = new Map(
        splits.map((val, idx) => [`person${idx}`, val])
      );

      const result = getPersonFinalFairLineItemTotals(total, personFinalTotals);

      // Sum in cents must exactly equal receipt total in cents
      const sumCents = Array.from(result.values()).reduce(
        (sum, val) => sum + Math.trunc(val * 100),
        0
      );
      const totalCents = Math.trunc(total * 100);

      expect(sumCents).toBe(totalCents);
    });
  });
});
