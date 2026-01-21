import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import Decimal from 'decimal.js';

/**
 * Extracts unique person names from line item assignments
 * @param lineItems Array of line items to extract people from
 * @returns Array of unique person names
 */
export const getPeopleFromLineItems = (
  lineItems: readonly ReceiptLineItem[]
): string[] => {
  const allAssignments = lineItems.flatMap((item) => item.assignments);

  return Array.from(new Set(allAssignments));
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
 * @param person The person to find items for
 * @param receipt The receipt containing line items
 * @returns Array of person items with calculated costs
 */
export const getPersonItems = (
  person: string,
  receipt: Receipt
): PersonItem[] => {
  const personItems: PersonItem[] = [];
  receipt.lineItems.forEach((item) => {
    const assignedPeople = item.assignments;

    if (assignedPeople.includes(person)) {
      const totalPrice = item.pricePerItem.mul(item.quantity);
      const pricePerPerson = totalPrice.div(new Decimal(assignedPeople.length));
      personItems.push({
        name: item.name,
        quantity: item.quantity,
        originalPrice: totalPrice,
        price: pricePerPerson,
        shared: assignedPeople.length > 1,
        sharedWith: assignedPeople.filter((p) => p !== person),
      });
    }
  });

  return personItems;
};
