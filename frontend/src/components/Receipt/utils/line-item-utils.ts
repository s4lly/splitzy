import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';

/**
 * Extracts unique person names from line item assignments
 * @param lineItems Array of line items to extract people from
 * @returns Array of unique person names
 */
export const getPeopleFromLineItems = (
  lineItems: z.infer<typeof LineItemSchema>[]
): string[] => {
  if (!lineItems) return [];

  const allAssignments = lineItems.flatMap((item) => item.assignments || []);

  return Array.from(new Set(allAssignments));
};

/**
 * Person item type for detailed breakdown
 */
export type PersonItem = {
  name: string;
  quantity: number;
  originalPrice: number;
  price: number;
  shared: boolean;
  sharedWith: string[];
};

/**
 * Finds all items assigned to a person and calculates their costs
 * @param person The person to find items for
 * @param receiptData The receipt data containing line items
 * @returns Array of person items with calculated costs
 */
export const getPersonItems = (
  person: string,
  receiptData: z.infer<typeof ReceiptSchema>
): PersonItem[] => {
  if (!receiptData.receipt_data.line_items) return [];

  const personItems: PersonItem[] = [];
  receiptData.receipt_data.line_items.forEach((item) => {
    const assignedPeople = item.assignments || [];
    const totalPrice = item.price_per_item * item.quantity;

    if (assignedPeople.includes(person)) {
      const pricePerPerson = totalPrice / assignedPeople.length;
      personItems.push({
        name: item.name,
        quantity: item.quantity || 1,
        originalPrice: totalPrice,
        price: pricePerPerson,
        shared: assignedPeople.length > 1,
        sharedWith: assignedPeople.filter((p) => p !== person),
      });
    }
  });

  return personItems;
};
