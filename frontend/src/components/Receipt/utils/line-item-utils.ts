import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import Decimal from 'decimal.js';

/**
 * Extracts unique receipt user IDs from line item assignments
 * @param lineItems Array of line items to extract receipt user IDs from
 * @returns Array of unique receipt user IDs
 */
export const getPeopleFromLineItems = (
  lineItems: readonly ReceiptLineItem[]
): number[] => {
  const allAssignments = lineItems.flatMap((item) => item.assignments);
  const receiptUserIds = allAssignments.map((assignment) => assignment.receiptUserId);

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
  receiptUserId: number,
  receipt: Receipt
): PersonItem[] => {
  const personItems: PersonItem[] = [];
  receipt.lineItems.forEach((item) => {
    const assignedReceiptUserIds = item.assignments.map((a) => a.receiptUserId);
    const isAssigned = assignedReceiptUserIds.includes(receiptUserId);

    if (isAssigned) {
      const totalPrice = item.pricePerItem.mul(item.quantity);
      const pricePerPerson = totalPrice.div(
        new Decimal(assignedReceiptUserIds.length)
      );
      personItems.push({
        name: item.name,
        quantity: item.quantity,
        originalPrice: totalPrice,
        price: pricePerPerson,
        shared: assignedReceiptUserIds.length > 1,
        // TODO: used person display name before
        // with receipt user id, maybe don't need to transform to string
        sharedWith: assignedReceiptUserIds
          .filter((id) => id !== receiptUserId)
          .map((id) => String(id)),
      });
    }
  });

  return personItems;
};
