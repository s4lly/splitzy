import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import Decimal from 'decimal.js';

/**
 * Extracts unique user IDs from line item assignments
 * @param lineItems Array of line items to extract user IDs from
 * @returns Array of unique user IDs
 */
export const getPeopleFromLineItems = (
  lineItems: readonly ReceiptLineItem[]
): number[] => {
  const allAssignments = lineItems.flatMap((item) => item.assignments);
  const userIds = allAssignments.map((assignment) => assignment.userId);

  return Array.from(new Set(userIds));
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
 * Finds all items assigned to a person and calculates their costs
 * @param personId The user ID of the person to find items for
 * @param receipt The receipt containing line items
 * @returns Array of person items with calculated costs
 */
export const getPersonItems = (
  personId: number,
  receipt: Receipt
): PersonItem[] => {
  const personItems: PersonItem[] = [];
  receipt.lineItems.forEach((item) => {
    const assignedUserIds = item.assignments.map((a) => a.userId);
    const isAssigned = assignedUserIds.includes(personId);

    if (isAssigned) {
      const totalPrice = item.pricePerItem.mul(item.quantity);
      const pricePerPerson = totalPrice.div(
        new Decimal(assignedUserIds.length)
      );
      personItems.push({
        name: item.name,
        quantity: item.quantity,
        originalPrice: totalPrice,
        price: pricePerPerson,
        shared: assignedUserIds.length > 1,
        // TODO: used person display name before
        // with user id, maybe don't need to transform to string
        sharedWith: assignedUserIds
          .filter((id) => id !== personId)
          .map((id) => String(id)),
      });
    }
  });

  return personItems;
};
