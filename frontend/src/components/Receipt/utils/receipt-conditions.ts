import Decimal from 'decimal.js';
import type { Receipt } from '@/models/Receipt';
import { ItemSplits } from './receipt-calculation';

/**
 * Pure function to check if receipt has line items.
 * Returns true if receipt has lineItems array with at least one item.
 */
export const hasLineItems = (receipt: Receipt): boolean => {
  return !!(receipt.lineItems && receipt.lineItems.length > 0);
};

/**
 * Pure function to check if item splits have line items (groups).
 * Returns true if there are any groups in the item splits, meaning items are assigned.
 */
export const receiptHasLineItems = (itemSplits: ItemSplits) => {
  return itemSplits.groups.size > 0;
};

/**
 * Pure function to check if no assignments have been made to any line items
 */
export const hasNoAssignmentsMade = (receipt: Receipt): boolean => {
  return (
    hasLineItems(receipt) &&
    receipt.lineItems.every(
      (item) => !item.assignments || item.assignments.length === 0
    )
  );
};

/**
 * Pure function to check if receipt has no assignments.
 * Returns true if:
 * - There are no line items at all, OR
 * - There are line items but none of them have any assignments
 * Returns false if:
 * - There are line items and at least one has assignments
 */
export const receiptHasNoAssignments = (receipt: Receipt): boolean => {
  if (!hasLineItems(receipt)) {
    return true; // No line items means no assignments
  }

  // Check if all line items have no assignments
  return receipt.lineItems.every(
    (item) => !item.assignments || item.assignments.length === 0
  );
};

/**
 * Pure function to check if equal split mode should be used
 * (no line items or no assignments made)
 */
export const shouldUseEqualSplit = (receipt: Receipt): boolean => {
  const noAssignmentsMade = hasNoAssignmentsMade(receipt);
  return !hasLineItems(receipt) || noAssignmentsMade;
};

/**
 * Pure function to check if all items have been assigned
 */
export const areAllItemsAssigned = (receipt: Receipt): boolean => {
  return (
    hasLineItems(receipt) &&
    receipt.lineItems.every(
      (item) => item.assignments && item.assignments.length > 0
    )
  );
};

/**
 * Pure function to check if tax should be applied to assigned items
 * Returns true when:
 * - Receipt has line items
 * - Tax is NOT included in items
 * - Tax amount is greater than 0
 * - There is at least some pre-tax assigned amount
 */
export const shouldApplyTaxToAssignedItems = (
  receipt: Receipt,
  totalPreTaxAssignedAmount: Decimal
): boolean => {
  return (
    hasLineItems(receipt) &&
    !receipt.taxIncludedInItems &&
    receipt.tax !== null &&
    receipt.tax.gt(0) &&
    totalPreTaxAssignedAmount.gt(0)
  );
};
