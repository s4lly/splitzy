import { LineItemSchema, ReceiptDataSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { truncateFloatByNDecimals } from './format-currency';

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

/**
 * Calculates the tax amount for a given total based on the receipt's tax and subtotal
 * @deprecated Use getTaxRate() instead and multiply by total
 * @param total The total amount to calculate tax for
 * @param receipt_data The receipt data containing tax and subtotal information
 * @returns The calculated tax amount
 */
export function getTaxAmount(
  total: number,
  receipt_data: z.infer<typeof ReceiptDataSchema>
) {
  // Avoid division by zero
  if (!receipt_data.display_subtotal) {
    console.warn('display_subtotal is 0, returning 0');
    return 0;
  }

  if (!receipt_data.tax) {
    console.warn('receipt tax is 0, returning 0');
    return 0;
  }

  return total * (receipt_data.tax / receipt_data.display_subtotal);
}

export function getTaxRate(receipt_data: z.infer<typeof ReceiptDataSchema>) {
  // Avoid division by zero
  if (!receipt_data.display_subtotal) {
    console.warn('receipt display_subtotal is 0, returning 0');
    return 0;
  }

  if (!receipt_data.tax) {
    console.warn('receipt tax is 0, returning 0');
    return 0;
  }

  return receipt_data.tax / receipt_data.display_subtotal;
}

// used to display ultimate total on receipt summary card
export function getTotal(receipt_data: z.infer<typeof ReceiptDataSchema>) {
  // If there are no line items, return 0 (matches test expectation)
  if (!receipt_data.line_items || receipt_data.line_items.length === 0) {
    return 0;
  }

  let total = 0;

  // derived
  total += getTotalForAllItems(receipt_data);
  total += getTaxAmount(total, receipt_data);

  // pulled from receipt
  total += receipt_data.gratuity || 0;
  total += receipt_data.tip || 0;

  return total;
}

export function getPersonPreTaxTotalForItem(
  item: z.infer<typeof LineItemSchema>,
  person: string,
  options?: {
    candidate?: { price_per_item: number; quantity: number };
  }
): number {
  const assignedPeople = item.assignments || [];

  if (assignedPeople.length === 0 || !assignedPeople.includes(person)) {
    return 0;
  }

  const itemTotalPrice = getIndividualItemTotalPrice(item, options?.candidate);

  // HERE problomatic, can get rounding errors
  const pricePerPerson = itemTotalPrice / assignedPeople.length;

  return pricePerPerson;
}

/**
 * Calculates pre-tax totals for each person based on their assigned items.
 * If a line item has no assignments, it is excluded from the calculations.
 * If all line items have no assignments, each person's total will be 0.
 *
 * @param receipt_data - Receipt data containing line items and tax information
 * @param people - Array of people to calculate totals for
 * @returns Map where keys are person names and values are their pre-tax item totals
 *
 * @example
 * ```ts
 * const receipt = {
 *   line_items: [
 *     {
 *       name: "Burger",
 *       price_per_item: 10,
 *       quantity: 1,
 *       assignments: ["Alice", "Bob"]
 *     },
 *     {
 *       name: "Fries",
 *       price_per_item: 4,
 *       quantity: 1,
 *       assignments: ["Alice"]
 *     },
 *     {
 *       name: "Soda",
 *       price_per_item: 2,
 *       quantity: 1,
 *       assignments: [] // No assignments, excluded from calculations
 *     }
 *   ]
 * };
 *
 * const people = ["Alice", "Bob"];
 * const totals = getPersonPreTaxItemTotals(receipt, people);
 *
 * // Returns Map {
 * //   "Alice" => 9, // $5 (half burger) + $4 (fries)
 * //   "Bob" => 5    // $5 (half burger)
 * //   // Soda ($2) not included since it has no assignments
 * // }
 * ```
 */
export function getPersonPreTaxItemTotals(
  receipt_data: z.infer<typeof ReceiptDataSchema>,
  people: string[]
): Map<string, number> {
  const personPreTaxItemTotals: Map<string, number> = new Map<string, number>(
    people.map((person) => [person, 0])
  );

  // TODO improve performance by using a map of people to items
  receipt_data.line_items.forEach((item) => {
    people.forEach((person) => {
      const personTotal = getPersonPreTaxTotalForItem(item, person);

      if (personTotal > 0) {
        personPreTaxItemTotals.set(
          person,
          (personPreTaxItemTotals.get(person) || 0) + personTotal
        );
      }
    });
  });

  return personPreTaxItemTotals;
}

/**
 * Represents a final total amount for a line item. The number is stored at full precision
 * without any rounding applied. This allows for accurate calculations and prevents
 * accumulation of rounding errors when performing arithmetic operations.
 *
 * @example
 * ```ts
 * const total: FinalLineItemTotal = 10.123456789; // Stored at full precision
 * ```
 */
export type FinalLineItemTotal = number;

/**
 * Represents a final "fair" total amount for a line item. The value will be rounded to 2 decimal places
 * and may include a "rounding penny" adjustment to account for rounding errors during arithmetic operations.
 * This ensures that the sum of all fair totals equals the original total amount.
 *
 * @example
 * ```ts
 * // Original totals: [10.333, 10.333, 10.334] (sum = 31.00)
 * // Fair totals after rounding: [10.33, 10.33, 10.34] (still sums to 31.00)
 * const fairTotal: FinalFairLineItemTotal = 10.34; // Includes rounding penny
 * ```
 */
export type FinalFairLineItemTotal = number;

export function getPersonFinalFairLineItemTotals(
  receiptTotal: number,
  personFinalLineItemTotals: Map<string, FinalLineItemTotal>
): Map<string, FinalFairLineItemTotal> {
  // Step 1: Round each share to 2 decimals
  const rounded = Array.from(personFinalLineItemTotals.entries()).map(
    ([name, value]) => ({
      name,
      original: value,
      rounded: truncateFloatByNDecimals(value, 2), // truncate to 2 decimals first
    })
  );

  // Step 2: Calculate rounding gap
  const roundedSum = rounded.reduce((sum, { rounded }) => sum + rounded, 0);

  // Work with cents (integers) to avoid floating point arithmetic errors
  // Truncate both values to cents, then calculate difference as integers
  const receiptTotalCents = Math.trunc(receiptTotal * 100);
  const roundedSumCents = Math.trunc(roundedSum * 100);
  let diffCents = receiptTotalCents - roundedSumCents;

  // Step 3: Sort by largest fractional part
  rounded.sort((a, b) => (b.original % 1) - (a.original % 1));

  // Step 4: Distribute the extra pennies
  if (diffCents > 0) {
    // Add pennies if rounding up
    for (let i = 0; i < rounded.length && diffCents > 0; i++, diffCents--) {
      rounded[i].rounded += 0.01;
    }
  } else if (diffCents < 0) {
    // Subtract pennies if rounding down
    for (let i = 0; i < rounded.length && diffCents < 0; i++, diffCents++) {
      rounded[i].rounded -= 0.01;
    }
  }

  // Step 5: Return final result
  const result: Map<string, FinalFairLineItemTotal> = new Map(
    rounded.map(({ name, rounded }) => [name, +rounded.toFixed(2)])
  );

  return result;
}

export function getPersonFinalTotals(
  receipt_data: z.infer<typeof ReceiptDataSchema>,
  people: string[]
): Map<string, FinalLineItemTotal> {
  // Check for equal split mode: no assignments made
  const receiptHasLineItems = receipt_data.line_items.length > 0;
  const noAssignmentToAnyLineItem = receipt_data.line_items.every(
    (item) => !item.assignments.length
  );

  // if no assignments made to any line item, split total evenly
  if (
    ((receiptHasLineItems && noAssignmentToAnyLineItem) ||
      !receiptHasLineItems) &&
    people.length > 0
  ) {
    const receiptTotal = getTotal(receipt_data);

    // split total evenly
    const splitAmount = receiptTotal / people.length;

    // EARLY RETURN
    return new Map(
      people.map((person): [string, number] => [person, splitAmount])
    );
  }

  // --

  // get pre-tax item totals for each person
  const personPreTaxLineItemTotals: Map<string, number> =
    getPersonPreTaxItemTotals(receipt_data, people);

  // prepare to link person to final total
  // - final should include tax, tip/gratuity, etc.
  // - initialize person totals with their pre-tax item costs
  const personFinalLineItemTotals: Map<string, number> = structuredClone(
    personPreTaxLineItemTotals
  );

  // get total pre-tax value of all assigned items
  const totalPreTaxAssignedItemsValue = Array.from(
    personPreTaxLineItemTotals.values()
  ).reduce((sum, value) => sum + value, 0);

  // Add tax if not already included in item prices
  if (
    receiptHasLineItems &&
    !receipt_data.tax_included_in_items &&
    (receipt_data.tax ?? 0) > 0 &&
    totalPreTaxAssignedItemsValue > 0
  ) {
    // TODO
    // - maybe throw in getTaxRate if tax rate is 0
    // - if throwing, then should catch and do something, not sure what yet
    const taxRate = getTaxRate(receipt_data);

    personPreTaxLineItemTotals.forEach((value, person) => {
      // using calculated tax rate to calculate tax on each item
      // TODO maybe separate so can allow user to adjust tax responsibility for each item
      const personTaxAmount = value * taxRate;

      personFinalLineItemTotals.set(
        person,
        (personFinalLineItemTotals.get(person) || 0) + personTaxAmount
      );
    });
  }

  // Add get total tip and gratuity
  const totalTip = (receipt_data.tip ?? 0) + (receipt_data.gratuity ?? 0);

  // if tip and gratuity present, split evenly between people
  if (totalTip > 0 && people.length > 0) {
    const tipPerPerson = totalTip / people.length;

    people.forEach((person) => {
      personFinalLineItemTotals.set(
        person,
        (personFinalLineItemTotals.get(person) || 0) + tipPerPerson
      );
    });
  }

  return personFinalLineItemTotals;
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
