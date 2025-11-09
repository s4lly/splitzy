import { ReceiptDataSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';

type ReceiptData = z.infer<typeof ReceiptDataSchema>;

/**
 * Pure function to check if receipt has line items
 */
export const hasReceiptLineItems = (receipt_data: ReceiptData): boolean => {
  return !!(receipt_data.line_items && receipt_data.line_items.length > 0);
};

/**
 * Pure function to check if no assignments have been made to any line items
 */
export const hasNoAssignmentsMade = (receipt_data: ReceiptData): boolean => {
  const hasLineItems = hasReceiptLineItems(receipt_data);
  return (
    hasLineItems &&
    receipt_data.line_items.every(
      (item) => !item.assignments || item.assignments.length === 0
    )
  );
};

/**
 * Pure function to check if equal split mode should be used
 * (no line items or no assignments made)
 */
export const shouldUseEqualSplit = (receipt_data: ReceiptData): boolean => {
  const hasLineItems = hasReceiptLineItems(receipt_data);
  const noAssignmentsMade = hasNoAssignmentsMade(receipt_data);
  return !hasLineItems || noAssignmentsMade;
};

/**
 * Pure function to check if all items have been assigned
 */
export const areAllItemsAssigned = (receipt_data: ReceiptData): boolean => {
  const hasLineItems = hasReceiptLineItems(receipt_data);
  return (
    hasLineItems &&
    receipt_data.line_items.every(
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
  receipt_data: ReceiptData,
  totalPreTaxAssignedAmount: number
): boolean => {
  const hasLineItems = hasReceiptLineItems(receipt_data);
  return (
    hasLineItems &&
    !receipt_data.tax_included_in_items &&
    (receipt_data.tax ?? 0) > 0 &&
    totalPreTaxAssignedAmount > 0
  );
};
