import { z } from 'zod';
import { LineItemSchema, ReceiptDataSchema } from '@/lib/receiptSchemas';

export function getTotalForAllItems(
  receipt_data: z.infer<typeof ReceiptDataSchema>
) {
  let total = 0;
  for (let item of receipt_data.line_items) {
    total += getIndividualItemTotalPrice(item);
  }
  return total;
}

export function getIndividualItemTotalPrice(
  item: z.infer<typeof LineItemSchema>,
  candidate?: { price_per_item: number; quantity: number }
) {
  return (
    (candidate?.price_per_item ?? item.price_per_item) *
    (candidate?.quantity ?? item.quantity)
  );
}

export function getTaxAmount(
  total: number,
  receipt_data: z.infer<typeof ReceiptDataSchema>
) {
  // Avoid division by zero
  if (!receipt_data.display_subtotal) return 0;
  return (
    total * ((receipt_data.tax || 0) / (receipt_data.display_subtotal || 0))
  );
}

export function getTotal(receipt_data: z.infer<typeof ReceiptDataSchema>) {
  // If there are no line items, return 0 (matches test expectation)
  if (!receipt_data.line_items || receipt_data.line_items.length === 0) {
    return 0;
  }
  let total = 0;

  total += getTotalForAllItems(receipt_data);
  total += getTaxAmount(total, receipt_data);
  total += receipt_data.gratuity || 0;

  // TODO get from receipt or collect from user
  total += receipt_data.tip || 0;

  return total;
}

export function getPersonPreTaxTotalForItem(
  item: z.infer<typeof LineItemSchema>,
  person: string,
  options?: {
    editLineItemsEnabled?: boolean;
    candidate?: { price_per_item: number; quantity: number };
  }
): number {
  const editLineItemsEnabled = options?.editLineItemsEnabled ?? false;

  const assignedPeople = item.assignments || [];

  if (assignedPeople.length === 0 || !assignedPeople.includes(person)) {
    return 0;
  }

  const itemTotalPrice = editLineItemsEnabled
    ? getIndividualItemTotalPrice(item, options?.candidate)
    : item.total_price;

  const pricePerPerson = itemTotalPrice / assignedPeople.length;

  return pricePerPerson;
}

export function getPersonPreTaxItemTotals(
  receipt_data: z.infer<typeof ReceiptDataSchema>,
  people: string[],
  options?: { editLineItemsEnabled?: boolean }
): Map<string, number> {
  const personPreTaxItemTotals: Map<string, number> = new Map(
    people.map((person) => [person, 0])
  );

  if (receipt_data.line_items && receipt_data.line_items.length > 0) {
    receipt_data.line_items.forEach((item) => {
      people.forEach((person) => {
        const personTotal = getPersonPreTaxTotalForItem(item, person, options);
        if (personTotal > 0) {
          personPreTaxItemTotals.set(
            person,
            (personPreTaxItemTotals.get(person) || 0) + personTotal
          );
        }
      });
    });
  }

  return personPreTaxItemTotals;
}

export function getPersonFinalTotals(
  receipt_data: z.infer<typeof ReceiptDataSchema>,
  people: string[],
  options?: { editLineItemsEnabled?: boolean }
): Map<string, number> {
  const editLineItemsEnabled = options?.editLineItemsEnabled ?? false;

  const personFinalTotals: Map<string, number> = new Map(
    people.map((person) => [person, 0])
  );
  const personPreTaxItemTotals = getPersonPreTaxItemTotals(
    receipt_data,
    people,
    options
  );

  let totalAssignedItemsValue = 0;
  personPreTaxItemTotals.forEach((value) => {
    totalAssignedItemsValue += value;
  });

  // Check for equal split mode: no assignments made
  const hasLineItems =
    receipt_data.line_items && receipt_data.line_items.length > 0;
  const noAssignmentsMade =
    hasLineItems &&
    receipt_data.line_items.every(
      (item) => !item.assignments || item.assignments.length === 0
    );

  if (hasLineItems && noAssignmentsMade && people.length > 0) {
    const receiptTotal = editLineItemsEnabled
      ? getTotal(receipt_data)
      : (receipt_data.final_total ?? receipt_data.total ?? 0);

    const splitAmount = receiptTotal / people.length;

    people.forEach((person) => {
      personFinalTotals.set(person, splitAmount);
    });

    return personFinalTotals;
  }

  // Initialize person totals with their item costs
  personPreTaxItemTotals.forEach((value, person) => {
    personFinalTotals.set(person, value);
  });

  // Add tax if not already included in item prices
  if (
    receipt_data.line_items &&
    receipt_data.line_items.length > 0 &&
    !receipt_data.tax_included_in_items &&
    (receipt_data.tax ?? 0) > 0 &&
    totalAssignedItemsValue > 0
  ) {
    const taxAmount = editLineItemsEnabled
      ? getTaxAmount(totalAssignedItemsValue, receipt_data)
      : (receipt_data.tax ?? 0);
    const pretaxTotal = editLineItemsEnabled
      ? getTotalForAllItems(receipt_data)
      : (receipt_data.pretax_total ?? receipt_data.items_total ?? 0);

    let taxRate = 0;
    if (pretaxTotal > 0) {
      taxRate = taxAmount / pretaxTotal;
    }

    personPreTaxItemTotals.forEach((value, person) => {
      const personTaxAmount = value * taxRate;

      personFinalTotals.set(
        person,
        (personFinalTotals.get(person) || 0) + personTaxAmount
      );
    });
  }

  // Add tip and gratuity if present
  const totalTip = (receipt_data.tip ?? 0) + (receipt_data.gratuity ?? 0);

  if (totalTip > 0 && people.length > 0) {
    const tipPerPerson = totalTip / people.length;

    people.forEach((person) => {
      personFinalTotals.set(
        person,
        (personFinalTotals.get(person) || 0) + tipPerPerson
      );
    });
  }

  // If no line items, split total evenly
  if (
    (!receipt_data.line_items || receipt_data.line_items.length === 0) &&
    people.length > 0
  ) {
    const receiptTotal = editLineItemsEnabled
      ? getTotal(receipt_data)
      : (receipt_data.final_total ?? receipt_data.total ?? 0);

    const splitAmount = receiptTotal / people.length;

    people.forEach((person) => {
      personFinalTotals.set(person, splitAmount);
    });
  }

  return personFinalTotals;
}

/**
 * Filters people based on assignment and search value.
 * @param people - All people
 * @param assignedPeople - People already assigned
 * @param searchValue - Optional search string
 * @returns Filtered people not assigned and matching search (if provided)
 */
export function filterPeople(
  people: string[],
  assignedPeople: string[],
  searchValue?: string
): string[] {
  if (searchValue) {
    return people.filter(
      (person) =>
        !assignedPeople.includes(person) &&
        person.toLowerCase().includes(searchValue.toLowerCase())
    );
  }

  return people.filter((person) => !assignedPeople.includes(person));
}
