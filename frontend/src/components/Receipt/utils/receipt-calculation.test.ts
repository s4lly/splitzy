import { describe, it, expect } from 'vitest';
import {
  getTotalForAllItems,
  getIndividualItemTotalPrice,
  getTaxAmount,
  getTotal,
  getPersonPreTaxItemTotals,
  getPersonFinalTotals,
} from './receipt-calculation';
import { getPersonPreTaxTotalForItem } from './receipt-calculation';
import { filterPeople } from './receipt-calculation';

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
  it('returns correct pre-tax totals for single person (editLineItemsEnabled: false)', () => {
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
    expect(result.get('Alice')).toBe(20);
  });

  it('returns correct pre-tax totals for single person (editLineItemsEnabled: true)', () => {
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
    const result = getPersonPreTaxItemTotals(receipt, people, {
      editLineItemsEnabled: true,
    });
    expect(result.get('Alice')).toBe(10);
  });

  it('returns correct pre-tax totals for multiple people with shared items (editLineItemsEnabled: false)', () => {
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

  it('returns correct pre-tax totals for multiple people with shared items (editLineItemsEnabled: true)', () => {
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
    const result = getPersonPreTaxItemTotals(receipt, people, {
      editLineItemsEnabled: true,
    });
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(16);
  });

  it('returns 0 for people not assigned to any items (editLineItemsEnabled: false)', () => {
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
    expect(result.get('Alice')).toBe(20);
    expect(result.get('Bob')).toBe(0);
  });

  it('returns 0 for people not assigned to any items (editLineItemsEnabled: true)', () => {
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
    const result = getPersonPreTaxItemTotals(receipt, people, {
      editLineItemsEnabled: true,
    });
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

  it('returns correct final totals with only one person and no tax/tip (editLineItemsEnabled: false)', () => {
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
    expect(result.get('Alice')).toBe(20);
  });

  it('returns correct final totals with only one person and no tax/tip (editLineItemsEnabled: true)', () => {
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
    const result = getPersonFinalTotals(receipt, people, {
      editLineItemsEnabled: true,
    });
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

  it('getPersonPreTaxTotalForItem uses candidate when editLineItemsEnabled is true', () => {
    const item = { ...baseItem };
    const result = getPersonPreTaxTotalForItem(item, 'Alice', {
      editLineItemsEnabled: true,
      candidate,
    });
    // candidate total: 45, split by 2 = 22.5
    expect(result).toBe(22.5);
  });

  it('getPersonPreTaxTotalForItem ignores candidate when editLineItemsEnabled is false', () => {
    const item = { ...baseItem };
    const result = getPersonPreTaxTotalForItem(item, 'Alice', {
      editLineItemsEnabled: false,
      candidate,
    });
    // should use item.total_price: 20 / 2 = 10
    expect(result).toBe(10);
  });

  it('getPersonPreTaxItemTotals uses candidate logic via editLineItemsEnabled', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
    };
    const people = ['Alice', 'Bob'];
    // getPersonPreTaxItemTotals does not accept candidate, only editLineItemsEnabled
    // So this just checks the split logic, not candidate
    const result = getPersonPreTaxItemTotals(receipt_data as any, people, {
      editLineItemsEnabled: true,
    });
    // Should use price_per_item * quantity = 10*2=20, split by 2 = 10
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(10);
  });

  it('getPersonFinalTotals uses editLineItemsEnabled logic', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
      tax: 0,
      gratuity: 0,
      tip: 0,
      tax_included_in_items: true,
    };
    const people = ['Alice', 'Bob'];
    // getPersonFinalTotals does not accept candidate, only editLineItemsEnabled
    const result = getPersonFinalTotals(receipt_data as any, people, {
      editLineItemsEnabled: true,
    });
    // Only item, so should match pre-tax split: 10 each
    expect(result.get('Alice')).toBe(10);
    expect(result.get('Bob')).toBe(10);
  });

  it('getPersonFinalTotals splits tip and gratuity evenly when editLineItemsEnabled is true', () => {
    const receipt_data = {
      line_items: [{ ...baseItem }],
      tax: 0,
      gratuity: 4,
      tip: 6,
      tax_included_in_items: true,
    };
    const people = ['Alice', 'Bob'];
    const result = getPersonFinalTotals(receipt_data as any, people, {
      editLineItemsEnabled: true,
    });
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
