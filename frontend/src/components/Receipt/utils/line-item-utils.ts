import Decimal from 'decimal.js';

import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

/**
 * Extracts unique receipt user IDs from line item assignments
 * @param lineItems Array of line items to extract receipt user IDs from
 * @returns Array of unique receipt user IDs
 */
export const getPeopleFromLineItems = (
  lineItems: readonly ReceiptLineItem[]
): string[] => {
  const allAssignments = lineItems
    .flatMap((item) => item.assignments)
    .filter((assignment) => !assignment.deletedAt);
  const receiptUserIds = allAssignments.map(
    (assignment) => assignment.receiptUserId
  );

  return Array.from(new Set(receiptUserIds));
};

/**
 * Person item type for detailed breakdown
 */
export type PersonItem = {
  name: string;
  quantity: Decimal;
  originalPrice: Decimal;
  price: Decimal;
  shared: boolean;
  sharedWith: string[];
};

/**
 * Finds all items assigned to a receipt user and calculates their costs
 * @param receiptUserId The receipt user ID of the person to find items for
 * @param receipt The receipt containing line items
 * @returns Array of person items with calculated costs
 */
export const getPersonItems = (
  receiptUserId: string, // ULID
  receipt: Receipt
): PersonItem[] => {
  const personItems: PersonItem[] = [];
  receipt.lineItems.forEach((item) => {
    const assignedReceiptUserIds = item.assignments
      .filter((a) => !a.deletedAt)
      .map((a) => a.receiptUserId);
    const isAssigned = assignedReceiptUserIds.includes(receiptUserId);

    if (isAssigned) {
      const originalPrice =
        calculations.pretax.getIndividualItemTotalPrice(item);
      const pricePerPerson = calculations.pretax.getPersonTotalForItem(
        item,
        receiptUserId
      );
      personItems.push({
        name: item.name ?? '(Unnamed item)',
        quantity: item.quantity,
        originalPrice,
        price: pricePerPerson,
        shared: assignedReceiptUserIds.length > 1,
        sharedWith: assignedReceiptUserIds.filter((id) => id !== receiptUserId),
      });
    }
  });

  return personItems;
};
