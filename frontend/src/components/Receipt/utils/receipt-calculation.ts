import { LineItemSchema, ReceiptDataSchema } from '@/lib/receiptSchemas';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { receiptHasLineItems } from './receipt-conditions';

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
// export type FinalLineItemTotal = number;

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
// export type FinalFairLineItemTotal = number;

/**
 * v1, person identifier is their name
 */
export type PersonIdentifier = string;

/**
 * v1, item identifier is uuid
 */
export type ItemIdentifier = string;

export type ItemSplits = {
  individuals: Map<PersonIdentifier, IndividualSplit[]>;
  groups: Map<ItemIdentifier, Set<PersonIdentifier>>;
};

export type SplitType = 'even' | 'proportional' | 'custom';

type IndividualSplit = {
  item: z.infer<typeof LineItemSchema>;
  type: SplitType;
};

const DEFAULT_SPLIT_TYPE = 'even';

/**
 * Receipt calculation functions organized by tax context.
 * Use namespaces to access functions: calculations.pretax.*, calculations.tax.*, calculations.final.*, calculations.utils.*
 */
export namespace calculations {
  /**
   * Pre-tax calculation functions.
   * These functions work with amounts before tax is applied.
   */
  export namespace pretax {
    /**
     * Gets the total price for a single line item (price_per_item * quantity).
     */
    export function getIndividualItemTotalPrice(
      item: z.infer<typeof LineItemSchema>,
      candidate?: { price_per_item: Decimal; quantity: Decimal }
    ): Decimal {
      const price =
        candidate?.price_per_item != null
          ? candidate.price_per_item
          : new Decimal(item.price_per_item);

      const quantity =
        candidate?.quantity != null
          ? candidate.quantity
          : new Decimal(item.quantity);

      return price.mul(quantity);
    }

    /**
     * Gets the total for all line items in the receipt (pre-tax).
     * Includes all items regardless of whether they are assigned or not.
     */
    export function getTotalForAllItems(
      receipt_data: z.infer<typeof ReceiptDataSchema>
    ): Decimal {
      let total = new Decimal(0);

      for (let item of receipt_data.line_items) {
        total = total.plus(getIndividualItemTotalPrice(item));
      }

      return total;
    }

    /**
     * Calculates the total for a specific person for a specific item.
     */
    export function getPersonTotalForItem(
      item: z.infer<typeof LineItemSchema>,
      person: string,
      options?: {
        candidate?: { price_per_item: Decimal; quantity: Decimal };
      }
    ): Decimal {
      const assignedPeople = item.assignments || [];

      if (assignedPeople.length === 0 || !assignedPeople.includes(person)) {
        return new Decimal(0);
      }

      const itemTotalPrice = getIndividualItemTotalPrice(
        item,
        options?.candidate
      );

      const pricePerPerson = itemTotalPrice.div(
        new Decimal(assignedPeople.length)
      );

      return pricePerPerson;
    }

    /**
     * Creates item splits structure from line item assignments.
     */
    export function createItemSplitsFromAssignments(
      lineItems: z.infer<typeof LineItemSchema>[]
    ): ItemSplits {
      const splits: ItemSplits = {
        individuals: new Map(),
        groups: new Map(),
      };

      for (const lineItem of lineItems) {
        for (const personIdentifier of lineItem.assignments) {
          let personSplits = splits.individuals.get(personIdentifier);

          if (!personSplits) {
            personSplits = [];
            splits.individuals.set(personIdentifier, personSplits);
          }

          personSplits.push({
            item: lineItem,
            type: DEFAULT_SPLIT_TYPE,
            // value: undefined,
          });

          let assignedPersons = splits.groups.get(lineItem.id);

          if (!assignedPersons) {
            assignedPersons = new Set();
            splits.groups.set(lineItem.id, assignedPersons);
          }

          assignedPersons.add(personIdentifier);
        }
      }

      return splits;
    }

    /**
     * Gets the split item total for a person from item splits.
     */
    export function getPersonSplitTotal(
      personIdentifier: string,
      itemSplits: ItemSplits
    ): Decimal {
      const individualSplits = itemSplits.individuals.get(personIdentifier);

      if (!individualSplits) {
        return new Decimal(0);
        // throw new Error('Individual splits not found');
      }

      let subtotal = new Decimal(0);

      for (const individualSplit of individualSplits) {
        switch (individualSplit.type) {
          case 'even': {
            const groupSize = itemSplits.groups.get(
              individualSplit.item.id
            )?.size;

            if (!groupSize) {
              throw new Error('Group size not found');
            }

            subtotal = Decimal.add(
              subtotal,
              Decimal.mul(
                new Decimal(individualSplit.item.price_per_item),
                new Decimal(individualSplit.item.quantity)
              ).div(new Decimal(groupSize))
            );
            break;
          }

          case 'proportional':
          case 'custom': {
            console.warn('Split type not implemented', individualSplit.type);
            break;
          }
        }
      }

      return subtotal;
    }

    /**
     * Gets item totals from item splits structure.
     */
    export function getPersonItemTotals(
      itemSplits: ItemSplits
    ): Map<PersonIdentifier, Decimal> {
      const personItemTotals: Map<PersonIdentifier, Decimal> = new Map();

      for (const [
        personIdentifier,
        individualSplits,
      ] of itemSplits.individuals) {
        for (const individualSplit of individualSplits) {
          switch (individualSplit.type) {
            case 'even': {
              const { item } = individualSplit;
              const groupSize = itemSplits.groups.get(item.id)?.size;

              if (!groupSize) {
                // should never happen, we add the person to the group when we add the split.
                throw new Error('Group size not found');
              }

              const splitValue = Decimal.mul(
                new Decimal(item.price_per_item),
                new Decimal(item.quantity)
              ).div(new Decimal(groupSize));

              personItemTotals.set(
                personIdentifier,
                Decimal.add(
                  personItemTotals.get(personIdentifier) ?? new Decimal(0),
                  splitValue
                )
              );
              break;
            }

            case 'proportional':
            case 'custom': {
              console.warn('Split type not implemented', individualSplit.type);
              break;
            }
          }
        }
      }

      return personItemTotals;
    }
  }

  /**
   * Tax calculation functions.
   * These functions calculate tax rates and amounts.
   */
  export namespace tax {
    /**
     * Calculates the tax rate based on receipt tax and subtotal.
     */
    export function getRate(
      receipt_data: z.infer<typeof ReceiptDataSchema>
    ): Decimal {
      // Avoid division by zero
      if (!receipt_data.display_subtotal) {
        return new Decimal(0);
      }

      if (!receipt_data.tax) {
        return new Decimal(0);
      }

      return new Decimal(receipt_data.tax).div(
        new Decimal(receipt_data.display_subtotal)
      );
    }
  }

  /**
   * Final/post-tax calculation functions.
   * These functions work with amounts after tax, tip, and gratuity are applied.
   */
  export namespace final {
    /**
     * Calculates the total receipt amount including all items, tax, tip, and gratuity.
     *
     * This function computes the grand total of the entire receipt:
     * 1. Sums all line items (pre-tax subtotal)
     * 2. Applies tax as a percentage of the subtotal
     * 3. Adds gratuity (if present)
     * 4. Adds tip (if present)
     *
     * This total represents the complete amount that would be paid for the entire receipt.
     * It is used by `getPersonTotals` when no line items are assigned (to split evenly),
     * and for displaying the ultimate total on the receipt summary card.
     *
     * @param receipt_data - The receipt data containing line items, tax, tip, and gratuity
     * @returns The total receipt amount (number). Returns 0 if there are no line items.
     *
     * @example
     * ```ts
     * // Receipt with items totaling $100, 10% tax, $5 tip, $2 gratuity
     * // Result: 100 + (100 * 0.10) + 5 + 2 = $117.00
     * const receiptTotal = calculations.final.getReceiptTotal(receipt_data);
     * ```
     */
    export function getReceiptTotal(
      receipt_data: z.infer<typeof ReceiptDataSchema>
    ): Decimal {
      let total = new Decimal(0);

      if (!(receipt_data.line_items && receipt_data.line_items.length > 0)) {
        return total;
      }

      // derived
      total = total.plus(pretax.getTotalForAllItems(receipt_data));
      total = total.plus(total.mul(tax.getRate(receipt_data)));

      // pulled from receipt
      total = total.plus(new Decimal(receipt_data.gratuity ?? 0));
      total = total.plus(new Decimal(receipt_data.tip ?? 0));

      return total;
    }

    /**
     * Calculates how much each person owes based on their assigned items and split preferences.
     *
     * This function distributes the receipt total among people according to:
     * - Which line items are assigned to each person (via `itemSplits`)
     * - How tax should be split (even or proportional to item totals)
     * - How tip should be split (even among all people)
     * - How gratuity should be split (even among all people)
     *
     * **Relationship to `getReceiptTotal`:**
     * - Uses `getReceiptTotal()` when no line items are assigned to split the receipt evenly
     * - Otherwise calculates each person's share independently based on their assigned items
     * - The sum of all person totals should equal the result of `getReceiptTotal()` (within rounding)
     *
     * **Calculation Flow:**
     * 1. If no line items are assigned: splits `getReceiptTotal()` evenly among all people
     * 2. If line items are assigned:
     *    a. Calculates each person's pre-tax item total
     *    b. Adds tax (split evenly or proportionally based on `taxSplitType`)
     *    c. Adds tip (split evenly based on `tipSplitType`)
     *    d. Adds gratuity (split evenly based on `gratuitySplitType`)
     *
     * @param receipt_data - The receipt data containing line items, tax, tip, and gratuity
     * @param options - Configuration for how amounts should be split
     * @param options.itemSplits - Map of which items are assigned to which people
     * @param options.taxSplitType - How to split tax: 'even' (equal) or 'proportional' (by item total). Default: 'proportional'
     * @param options.tipSplitType - How to split tip: 'even' (equal). Default: 'even'
     * @param options.gratuitySplitType - How to split gratuity: 'even' (equal). Default: 'even'
     * @returns A Map where keys are person identifiers and values are the total amount each person owes (number)
     *
     * @example
     * ```ts
     * // Alice assigned to $50 item, Bob assigned to $30 item
     * // Tax: 10%, Tip: $5, Gratuity: $2
     * // Tax split: proportional, Tip/Gratuity: even
     * const personTotals = calculations.final.getPersonTotals(receipt_data, {
     *   itemSplits,
     *   taxSplitType: 'proportional',
     *   tipSplitType: 'even',
     *   gratuitySplitType: 'even'
     * });
     * // Result:
     * // Alice: 50 + (50 * 0.10) + 2.5 + 1 = $58.50
     * // Bob: 30 + (30 * 0.10) + 2.5 + 1 = $36.50
     * ```
     */
    export function getPersonTotals(
      receipt_data: z.infer<typeof ReceiptDataSchema>,
      {
        itemSplits,
        taxSplitType = 'proportional',
        tipSplitType = 'even',
        gratuitySplitType = 'even',
      }: {
        itemSplits: ItemSplits;
        taxSplitType?: SplitType;
        tipSplitType?: SplitType;
        gratuitySplitType?: SplitType;
      }
    ): Map<PersonIdentifier, Decimal> {
      const hasLineItems = receiptHasLineItems(itemSplits);

      // if no assignments made to any line item, split total evenly
      if (!hasLineItems && itemSplits.individuals.size > 0) {
        const receiptTotal = getReceiptTotal(receipt_data);

        // split total evenly
        const splitAmount = receiptTotal.div(itemSplits.individuals.size);

        // EARLY RETURN
        return new Map(
          Array.from(itemSplits.individuals.keys()).map(
            (personIdentifier): [PersonIdentifier, Decimal] => [
              personIdentifier,
              splitAmount,
            ]
          )
        );
      }

      // --

      // get the total amount for all items assigned to each person
      const personItemTotals = pretax.getPersonItemTotals(itemSplits);

      // --

      if (hasLineItems && !receipt_data.tax_included_in_items) {
        // get the total value of all assigned items
        const totalAssignedItemsValue = Decimal.sum(
          ...Array.from(personItemTotals.values())
        );

        const taxRate = tax.getRate(receipt_data);
        const taxAmount = totalAssignedItemsValue.mul(taxRate);

        switch (taxSplitType) {
          case 'even': {
            const taxPerPerson = taxAmount.div(
              new Decimal(personItemTotals.size)
            );

            for (const [personIdentifier, itemTotal] of personItemTotals) {
              personItemTotals.set(
                personIdentifier,
                itemTotal.add(taxPerPerson)
              );
            }

            break;
          }

          case 'proportional': {
            for (const [personIdentifier, itemTotal] of personItemTotals) {
              const personSplitTotal = pretax.getPersonSplitTotal(
                personIdentifier,
                itemSplits
              );

              const burden = personSplitTotal.div(totalAssignedItemsValue);
              const personTaxAmount = taxAmount.mul(burden);

              personItemTotals.set(
                personIdentifier,
                itemTotal.add(personTaxAmount)
              );
            }

            break;
          }

          case 'custom': {
            console.warn('Split type not implemented', taxSplitType);
            break;
          }
        }
      }

      // --

      if (receipt_data.tip) {
        switch (tipSplitType) {
          case 'even': {
            const tipPerPerson = new Decimal(receipt_data.tip).div(
              new Decimal(personItemTotals.size)
            );

            for (const [personIdentifier, itemTotal] of personItemTotals) {
              personItemTotals.set(
                personIdentifier,
                itemTotal.add(tipPerPerson)
              );
            }

            break;
          }

          case 'proportional':
          case 'custom': {
            console.warn('Split type not implemented', tipSplitType);
            break;
          }
        }
      }

      // --

      if (receipt_data.gratuity) {
        switch (gratuitySplitType) {
          case 'even': {
            const gratuityPerPerson = new Decimal(receipt_data.gratuity).div(
              new Decimal(personItemTotals.size)
            );

            for (const [personIdentifier, itemTotal] of personItemTotals) {
              personItemTotals.set(
                personIdentifier,
                itemTotal.add(gratuityPerPerson)
              );
            }

            break;
          }

          case 'proportional':
          case 'custom': {
            console.warn('Split type not implemented', gratuitySplitType);
            break;
          }
        }
      }

      return personItemTotals;
    }

    /**
     * Calculates fair totals with proper rounding and penny distribution.
     */
    export function getPersonFairTotals(
      receiptTotal: Decimal,
      personTotals: Map<string, Decimal>
    ): Map<string, Decimal> {
      // Step 1: Convert to cents (truncate directly to avoid double-conversion errors)
      const inCents = Array.from(personTotals).map(([name, value]) => ({
        name,
        original: value,
        cents: new Decimal(value).mul(100).trunc(), // Convert directly to integer cents
      }));

      // Step 2: Calculate rounding gap in cents
      const roundedSumCents = Decimal.sum(...inCents.map(({ cents }) => cents));
      const receiptTotalCents = receiptTotal.mul(100).trunc();
      let diffCents = receiptTotalCents.minus(roundedSumCents);

      // Step 3: Sort by largest fractional part (for fair distribution of pennies)
      inCents.sort((a, b) => b.original.mod(1).cmp(a.original.mod(1)));

      // Step 4: Distribute the extra pennies by working with integer cents
      if (inCents.length > 0) {
        let index = 0;
        while (!diffCents.isZero()) {
          const entry = inCents[index % inCents.length];
          entry.cents = entry.cents.plus(diffCents.gt(0) ? 1 : -1); // Add or subtract 1 cent (integer arithmetic)
          diffCents = diffCents.plus(diffCents.gt(0) ? -1 : 1);
          index++;
        }
      }

      // Step 5: Convert back to dollars and return
      const result: Map<string, Decimal> = new Map(
        inCents.map(({ name, cents }) => [name, cents.div(100)])
      );

      return result;
    }
  }

  /**
   * Utility functions for receipt calculations.
   */
  export namespace utils {
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
  }
}
