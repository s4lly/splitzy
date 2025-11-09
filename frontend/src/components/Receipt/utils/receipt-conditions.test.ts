import { describe, expect, it } from 'vitest';
import {
  areAllItemsAssigned,
  hasNoAssignmentsMade,
  hasReceiptLineItems,
  shouldApplyTaxToAssignedItems,
  shouldUseEqualSplit,
} from './receipt-conditions';

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

describe('hasReceiptLineItems', () => {
  it('returns true when receipt has line items', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
    });
    expect(hasReceiptLineItems(receipt)).toBe(true);
  });

  it('returns true when receipt has multiple line items', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem(), makeLineItem(), makeLineItem()],
    });
    expect(hasReceiptLineItems(receipt)).toBe(true);
  });

  it('returns false when line_items is empty array', () => {
    const receipt = makeReceiptData({
      line_items: [],
    });
    expect(hasReceiptLineItems(receipt)).toBe(false);
  });

  it('returns false when line_items is null', () => {
    const receipt = makeReceiptData({
      line_items: null as any,
    });
    expect(hasReceiptLineItems(receipt)).toBe(false);
  });

  it('returns false when line_items is undefined', () => {
    const receipt = makeReceiptData({
      line_items: undefined as any,
    });
    expect(hasReceiptLineItems(receipt)).toBe(false);
  });
});

describe('hasNoAssignmentsMade', () => {
  it('returns true when receipt has line items but no assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: [] }),
      ],
    });
    expect(hasNoAssignmentsMade(receipt)).toBe(true);
  });

  it('returns true when assignments are undefined', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: undefined }),
        makeLineItem({ assignments: undefined }),
      ],
    });
    expect(hasNoAssignmentsMade(receipt)).toBe(true);
  });

  it('returns false when at least one item has assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: ['Alice'] }),
      ],
    });
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
  });

  it('returns false when all items have assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: ['Bob'] }),
        makeLineItem({ assignments: ['Alice', 'Bob'] }),
      ],
    });
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
  });

  it('returns false when receipt has no line items', () => {
    const receipt = makeReceiptData({
      line_items: [],
    });
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
  });

  it('returns false when line_items is null', () => {
    const receipt = makeReceiptData({
      line_items: null as any,
    });
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
  });
});

describe('shouldUseEqualSplit', () => {
  it('returns true when receipt has no line items', () => {
    const receipt = makeReceiptData({
      line_items: [],
    });
    expect(shouldUseEqualSplit(receipt)).toBe(true);
  });

  it('returns true when line_items is null', () => {
    const receipt = makeReceiptData({
      line_items: null as any,
    });
    expect(shouldUseEqualSplit(receipt)).toBe(true);
  });

  it('returns true when receipt has line items but no assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: [] }),
      ],
    });
    expect(shouldUseEqualSplit(receipt)).toBe(true);
  });

  it('returns false when at least one item has assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: ['Alice'] }),
      ],
    });
    expect(shouldUseEqualSplit(receipt)).toBe(false);
  });

  it('returns false when all items have assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: ['Bob', 'Charlie'] }),
      ],
    });
    expect(shouldUseEqualSplit(receipt)).toBe(false);
  });
});

describe('areAllItemsAssigned', () => {
  it('returns true when all items have assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: ['Bob'] }),
        makeLineItem({ assignments: ['Alice', 'Bob'] }),
      ],
    });
    expect(areAllItemsAssigned(receipt)).toBe(true);
  });

  it('returns false when some items have no assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: [] }),
      ],
    });
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('returns false when all items have no assignments', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: [] }),
      ],
    });
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('returns false when some assignments are undefined', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: undefined }),
      ],
    });
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('returns false when receipt has no line items', () => {
    const receipt = makeReceiptData({
      line_items: [],
    });
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('returns false when line_items is null', () => {
    const receipt = makeReceiptData({
      line_items: null as any,
    });
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('returns true when single item has assignment', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem({ assignments: ['Alice'] })],
    });
    expect(areAllItemsAssigned(receipt)).toBe(true);
  });
});

describe('shouldApplyTaxToAssignedItems', () => {
  it('returns true when all conditions are met', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: 5,
    });
    const totalPreTaxAssignedAmount = 100;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      true
    );
  });

  it('returns false when receipt has no line items', () => {
    const receipt = makeReceiptData({
      line_items: [],
      tax_included_in_items: false,
      tax: 5,
    });
    const totalPreTaxAssignedAmount = 100;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns false when tax is included in items', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: true,
      tax: 5,
    });
    const totalPreTaxAssignedAmount = 100;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns false when tax is 0', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: 0,
    });
    const totalPreTaxAssignedAmount = 100;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns false when tax is null', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: null,
    });
    const totalPreTaxAssignedAmount = 100;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns false when tax is negative', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: -5,
    });
    const totalPreTaxAssignedAmount = 100;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns false when totalPreTaxAssignedAmount is 0', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: 5,
    });
    const totalPreTaxAssignedAmount = 0;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns false when totalPreTaxAssignedAmount is negative', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: 5,
    });
    const totalPreTaxAssignedAmount = -10;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns true with very small positive amounts', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem()],
      tax_included_in_items: false,
      tax: 0.01,
    });
    const totalPreTaxAssignedAmount = 0.01;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      true
    );
  });

  it('returns false when multiple conditions fail', () => {
    const receipt = makeReceiptData({
      line_items: [],
      tax_included_in_items: true,
      tax: 0,
    });
    const totalPreTaxAssignedAmount = 0;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      false
    );
  });

  it('returns true with large tax and assigned amounts', () => {
    const receipt = makeReceiptData({
      line_items: [makeLineItem(), makeLineItem()],
      tax_included_in_items: false,
      tax: 999.99,
    });
    const totalPreTaxAssignedAmount = 10000;
    expect(shouldApplyTaxToAssignedItems(receipt, totalPreTaxAssignedAmount)).toBe(
      true
    );
  });
});

describe('receipt-conditions edge cases', () => {
  it('handles receipt with only unassigned items correctly', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: [] }),
      ],
    });

    expect(hasReceiptLineItems(receipt)).toBe(true);
    expect(hasNoAssignmentsMade(receipt)).toBe(true);
    expect(shouldUseEqualSplit(receipt)).toBe(true);
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('handles receipt with all assigned items correctly', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: ['Bob'] }),
        makeLineItem({ assignments: ['Alice', 'Bob'] }),
      ],
    });

    expect(hasReceiptLineItems(receipt)).toBe(true);
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
    expect(shouldUseEqualSplit(receipt)).toBe(false);
    expect(areAllItemsAssigned(receipt)).toBe(true);
  });

  it('handles receipt with partially assigned items correctly', () => {
    const receipt = makeReceiptData({
      line_items: [
        makeLineItem({ assignments: ['Alice'] }),
        makeLineItem({ assignments: [] }),
        makeLineItem({ assignments: ['Bob'] }),
      ],
    });

    expect(hasReceiptLineItems(receipt)).toBe(true);
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
    expect(shouldUseEqualSplit(receipt)).toBe(false);
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });

  it('handles empty receipt correctly', () => {
    const receipt = makeReceiptData({
      line_items: [],
    });

    expect(hasReceiptLineItems(receipt)).toBe(false);
    expect(hasNoAssignmentsMade(receipt)).toBe(false);
    expect(shouldUseEqualSplit(receipt)).toBe(true);
    expect(areAllItemsAssigned(receipt)).toBe(false);
  });
});

