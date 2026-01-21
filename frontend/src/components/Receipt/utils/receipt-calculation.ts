import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import Decimal from 'decimal.js';
import { receiptHasLineItems } from './receipt-conditions';

/**
 * Person identifier type.
 * In v1, the person identifier is their name (string).
 *
 * @example
 * ```ts
 * const personId: PersonIdentifier = 'Alice';
 * ```
 */
export type PersonIdentifier = string;

/**
 * Item identifier type.
 * In v1, the item identifier is a UUID (string).
 *
 * @example
 * ```ts
 * const itemId: ItemIdentifier = '550e8400-e29b-41d4-a716-446655440000';
 * ```
 */
export type ItemIdentifier = string;

/**
 * Structure organizing how line items are split among people.
 *
 * - `individuals`: Maps each person to an array of items they're assigned to, along with split type
 * - `groups`: Maps each item to the set of people assigned to it (used to determine split size)
 *
 * @example
 * ```ts
 * const itemSplits: ItemSplits = {
 *   individuals: new Map([
 *     ['Alice', [{ item: item1, type: 'even' }, { item: item2, type: 'even' }]],
 *     ['Bob', [{ item: item1, type: 'even' }]]
 *   ]),
 *   groups: new Map([
 *     ['item1', new Set(['Alice', 'Bob'])],
 *     ['item2', new Set(['Alice'])]
 *   ])
 * };
 * ```
 */
export type ItemSplits = {
  individuals: Map<PersonIdentifier, IndividualSplit[]>;
  groups: Map<ItemIdentifier, Set<PersonIdentifier>>;
};

/**
 * Type of split calculation method.
 * - `'even'`: Split equally among assigned people (currently implemented)
 * - `'proportional'`: Split proportionally based on some criteria (not yet implemented)
 * - `'custom'`: Custom split logic (not yet implemented)
 */
export type SplitType = 'even' | 'proportional' | 'custom';

type IndividualSplit = {
  item: ReceiptLineItem;
  type: SplitType;
};

const DEFAULT_SPLIT_TYPE = 'even';

/**
 * Receipt calculation functions organized by tax context.
 * Use namespaces to access functions: calculations.pretax.*, calculations.tax.*, calculations.final.*, calculations.utils.*
 */
export namespace calculations {
  /**
   * Custom error class for receipt calculation errors.
   * Extends the native Error class to allow instanceof checks in try/catch blocks.
   *
   * @example
   * ```ts
   * try {
   *   // some calculation that might throw
   *   throw new calculations.ReceiptCalculationError('Invalid calculation');
   * } catch (error) {
   *   if (error instanceof calculations.ReceiptCalculationError) {
   *     // Handle receipt calculation error specifically
   *     console.error('Calculation error:', error.message);
   *   } else {
   *     // Handle other errors
   *     throw error;
   *   }
   * }
   * ```
   */
  export class ReceiptCalculationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ReceiptCalculationError';
      // Maintains proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ReceiptCalculationError);
      }
      // Fix prototype chain for instanceof to work correctly
      Object.setPrototypeOf(this, ReceiptCalculationError.prototype);
    }
  }

  /**
   * Pre-tax calculation functions.
   * These functions work with amounts before tax is applied.
   */
  export namespace pretax {
    /**
     * Calculates the total price for a single line item by multiplying price per item by quantity.
     * Uses Decimal.js for precise arithmetic to avoid floating-point rounding errors.
     *
     * @param item - The line item containing pricePerItem and quantity (already as Decimal)
     * @param candidate - Optional override values for pricePerItem and quantity (as Decimal instances)
     * @returns The total price as a Decimal instance (pricePerItem * quantity)
     *
     * @example
     * ```ts
     * const item = { pricePerItem: new Decimal(9.99), quantity: new Decimal(2), ... };
     * const total = calculations.pretax.getIndividualItemTotalPrice(item);
     * // Returns: new Decimal(19.98)
     *
     * // With candidate values
     * const total = calculations.pretax.getIndividualItemTotalPrice(item, {
     *   pricePerItem: new Decimal(10.00),
     *   quantity: new Decimal(3)
     * });
     * // Returns: new Decimal(30.00)
     * ```
     */
    export function getIndividualItemTotalPrice(
      item: ReceiptLineItem,
      candidate?: { pricePerItem: Decimal; quantity: Decimal }
    ): Decimal {
      const price =
        candidate?.pricePerItem != null
          ? candidate.pricePerItem
          : item.pricePerItem;

      const quantity =
        candidate?.quantity != null ? candidate.quantity : item.quantity;

      return price.mul(quantity);
    }

    /**
     * Calculates the sum of all line items in the receipt (pre-tax subtotal).
     * Includes all items regardless of whether they are assigned to people or not.
     * Uses Decimal.js for precise arithmetic to ensure accurate totals.
     *
     * @param receipt - The receipt containing line items
     * @returns The sum of all line item totals as a Decimal instance. Returns Decimal(0) if no items exist.
     *
     * @example
     * ```ts
     * // Receipt with items: $10.50, $5.25, $3.75
     * const subtotal = calculations.pretax.getTotalForAllItems(receipt);
     * // Returns: new Decimal(19.50)
     * ```
     */
    export function getTotalForAllItems(receipt: Receipt): Decimal {
      let total = new Decimal(0);

      for (const item of receipt.lineItems) {
        total = total.plus(getIndividualItemTotalPrice(item));
      }

      return total;
    }

    /**
     * Calculates how much a specific person owes for a specific line item.
     * If the person is not assigned to the item, returns Decimal(0).
     * The amount is split evenly among all people assigned to the item.
     * Uses Decimal.js for precise division to avoid rounding errors.
     *
     * @param item - The line item containing pricePerItem, quantity, and assignments
     * @param person - The person identifier to calculate the total for
     * @param options - Optional configuration
     * @param options.candidate - Optional override values for pricePerItem and quantity (as Decimal instances)
     * @returns The person's share of the item total as a Decimal instance. Returns Decimal(0) if person is not assigned.
     *
     * @example
     * ```ts
     * // Item costs $30.00, assigned to Alice and Bob
     * const aliceTotal = calculations.pretax.getPersonTotalForItem(item, 'Alice');
     * // Returns: new Decimal(15.00) - split evenly between 2 people
     *
     * // Item costs $20.00, assigned to Alice, Bob, and Charlie
     * const aliceTotal = calculations.pretax.getPersonTotalForItem(item, 'Alice');
     * // Returns: new Decimal(6.66666666666666666667) - split evenly between 3 people
     * ```
     */
    export function getPersonTotalForItem(
      item: ReceiptLineItem,
      person: string,
      options?: {
        candidate?: { pricePerItem: Decimal; quantity: Decimal };
      }
    ): Decimal {
      const assignedPeople = item.assignments;

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
     * Builds an ItemSplits structure from line item assignments.
     * This structure organizes which people are assigned to which items and how items are split.
     * Used as input for other calculation functions that need to know item-to-person relationships.
     *
     * The resulting structure contains:
     * - `individuals`: A map of person identifiers to their assigned items
     * - `groups`: A map of item identifiers to the set of people assigned to each item
     *
     * @param lineItems - Array of line items with their assignments
     * @returns An ItemSplits object containing organized assignment information
     *
     * @example
     * ```ts
     * const lineItems = [
     *   { id: 'item1', assignments: ['Alice', 'Bob'], ... },
     *   { id: 'item2', assignments: ['Bob'], ... }
     * ];
     * const splits = calculations.pretax.createItemSplitsFromAssignments(lineItems);
     * // Result:
     * // {
     * //   individuals: Map([
     * //     ['Alice', [{ item: item1, type: 'even' }]],
     * //     ['Bob', [{ item: item1, type: 'even' }, { item: item2, type: 'even' }]]
     * //   ]),
     * //   groups: Map([
     * //     ['item1', Set(['Alice', 'Bob'])],
     * //     ['item2', Set(['Bob'])]
     * //   ])
     * // }
     * ```
     */
    export function createItemSplitsFromAssignments(
      lineItems: readonly ReceiptLineItem[]
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
     * Calculates the total pre-tax amount a person owes across all their assigned items.
     * Sums up each person's share of each assigned item based on the split type.
     * Currently only supports 'even' splits (items divided equally among assigned people).
     * Uses Decimal.js for precise arithmetic to avoid rounding errors.
     *
     * @param personIdentifier - The person identifier to calculate the total for
     * @param itemSplits - The ItemSplits structure containing assignment information
     * @returns The person's total pre-tax amount as a Decimal instance. Returns Decimal(0) if person has no assignments.
     *
     * @example
     * ```ts
     * // Alice assigned to:
     * // - Item 1: $30.00 (split with Bob) -> Alice owes $15.00
     * // - Item 2: $20.00 (split with Bob and Charlie) -> Alice owes $6.67
     * const aliceTotal = calculations.pretax.getPersonSplitTotal('Alice', itemSplits);
     * // Returns: new Decimal(21.66666666666666666667)
     * ```
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
                individualSplit.item.pricePerItem,
                individualSplit.item.quantity
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
     * Calculates pre-tax item totals for each person based on their assigned items.
     * Returns a map where each person's identifier maps to their total pre-tax amount.
     * Currently only supports 'even' splits (items divided equally among assigned people).
     * Uses Decimal.js for precise arithmetic to ensure accurate totals.
     *
     * This function is similar to `getPersonSplitTotal` but returns totals for all people at once,
     * making it more efficient when you need totals for multiple people.
     *
     * @param itemSplits - The ItemSplits structure containing assignment information
     * @returns A Map of person identifiers to their pre-tax total as Decimal instances
     *
     * @example
     * ```ts
     * const personTotals = calculations.pretax.getAllPersonItemTotals(itemSplits);
     * // Returns: Map([
     * //   ['Alice', new Decimal(21.67)],
     * //   ['Bob', new Decimal(25.00)],
     * //   ['Charlie', new Decimal(6.67)]
     * // ])
     * ```
     */
    export function getAllPersonItemTotals(
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
                item.pricePerItem,
                item.quantity
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
     * Calculates the tax rate as a decimal (e.g., 0.10 for 10% tax).
     * Computed by dividing the tax amount by the display subtotal.
     * Uses Decimal.js for precise division to avoid floating-point errors.
     * Returns Decimal(0) if subtotal is zero or tax is not provided.
     *
     * @param receipt - The receipt containing tax and displaySubtotal (already as Decimal)
     * @returns The tax rate as a Decimal instance (tax / displaySubtotal). Returns Decimal(0) if subtotal is zero or tax is missing.
     *
     * @example
     * ```ts
     * // Receipt with $10.00 tax on $100.00 subtotal
     * const taxRate = calculations.tax.getRate(receipt);
     * // Returns: new Decimal(0.10) // 10% tax rate
     *
     * // Receipt with $8.50 tax on $85.00 subtotal
     * const taxRate = calculations.tax.getRate(receipt);
     * // Returns: new Decimal(0.10) // Still 10% tax rate
     * ```
     */
    export function getRate(receipt: Receipt): Decimal {
      // Avoid division by zero
      if (!receipt.displaySubtotal) {
        return new Decimal(0);
      }

      if (!receipt.tax) {
        return new Decimal(0);
      }

      return receipt.tax.div(receipt.displaySubtotal);
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
     * Uses Decimal.js for precise arithmetic to ensure accurate totals and avoid floating-point
     * rounding errors when adding tax, tip, and gratuity.
     *
     * @param receipt - The receipt containing line items, tax, tip, and gratuity (already as Decimal)
     * @returns The total receipt amount as a Decimal instance. Returns Decimal(0) if there are no line items.
     *
     * @example
     * ```ts
     * // Receipt with items totaling $100, 10% tax, $5 tip, $2 gratuity
     * // Calculation: 100 + (100 * 0.10) + 5 + 2 = $117.00
     * const receiptTotal = calculations.final.getReceiptTotal(receipt);
     * // Returns: new Decimal(117.00)
     *
     * // Receipt with items totaling $99.99, 8.5% tax, $10 tip
     * // Calculation: 99.99 + (99.99 * 0.085) + 10 = $118.48915
     * const receiptTotal = calculations.final.getReceiptTotal(receipt);
     * // Returns: new Decimal(118.48915) // Precise, no rounding errors
     * ```
     */
    export function getReceiptTotal(receipt: Receipt): Decimal {
      let total = new Decimal(0);

      if (!(receipt.lineItems && receipt.lineItems.length > 0)) {
        return total;
      }

      // derived
      total = total.plus(pretax.getTotalForAllItems(receipt));
      total = total.plus(total.mul(tax.getRate(receipt)));

      // pulled from receipt
      total = total.plus(receipt.gratuity ?? new Decimal(0));
      total = total.plus(receipt.tip ?? new Decimal(0));

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
     * Uses Decimal.js for precise arithmetic to ensure accurate calculations and avoid rounding errors
     * when splitting tax, tip, and gratuity among multiple people.
     *
     * @param receipt - The receipt containing line items, tax, tip, and gratuity (already as Decimal)
     * @param options - Configuration for how amounts should be split
     * @param options.itemSplits - Map of which items are assigned to which people
     * @param options.taxSplitType - How to split tax: 'even' (equal) or 'proportional' (by item total). Default: 'proportional'
     * @param options.tipSplitType - How to split tip: 'even' (equal). Default: 'even'
     * @param options.gratuitySplitType - How to split gratuity: 'even' (equal). Default: 'even'
     * @returns A Map where keys are person identifiers and values are the total amount each person owes as Decimal instances
     *
     * @example
     * ```ts
     * // Alice assigned to $50 item, Bob assigned to $30 item
     * // Tax: 10%, Tip: $5, Gratuity: $2
     * // Tax split: proportional, Tip/Gratuity: even
     * const personTotals = calculations.final.getPersonTotals(receipt, {
     *   itemSplits,
     *   taxSplitType: 'proportional',
     *   tipSplitType: 'even',
     *   gratuitySplitType: 'even'
     * });
     * // Returns: Map([
     * //   ['Alice', new Decimal(58.50)], // 50 + (50 * 0.10) + 2.5 + 1
     * //   ['Bob', new Decimal(36.50)]     // 30 + (30 * 0.10) + 2.5 + 1
     * // ])
     *
     * // Even split example (no items assigned)
     * // Receipt total: $100, 2 people
     * const personTotals = calculations.final.getPersonTotals(receipt, {
     *   itemSplits: { individuals: new Map([['Alice', []], ['Bob', []]]), groups: new Map() },
     *   taxSplitType: 'even'
     * });
     * // Returns: Map([
     * //   ['Alice', new Decimal(50.00)],
     * //   ['Bob', new Decimal(50.00)]
     * // ])
     * ```
     */
    export function getPersonTotals(
      receipt: Receipt,
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
        const receiptTotal = getReceiptTotal(receipt);

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
      const personItemTotals = pretax.getAllPersonItemTotals(itemSplits);

      // --

      if (hasLineItems && !receipt.taxIncludedInItems) {
        // get the total value of all assigned items
        const totalAssignedItemsValue = personItemTotals.size
          ? Decimal.sum(...Array.from(personItemTotals.values()))
          : new Decimal(0);

        const taxRate = tax.getRate(receipt);
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

      if (receipt.tip) {
        switch (tipSplitType) {
          case 'even': {
            const tipPerPerson = receipt.tip.div(
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

      if (receipt.gratuity) {
        switch (gratuitySplitType) {
          case 'even': {
            const gratuityPerPerson = receipt.gratuity.div(
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
     * Calculates "fair" totals with proper rounding and penny distribution to ensure the sum equals the receipt total.
     *
     * This function addresses the rounding problem: when individual person totals are rounded to 2 decimal places,
     * their sum may not equal the original receipt total. This function distributes rounding differences (pennies)
     * fairly among people.
     *
     * **Algorithm:**
     * 1. Converts all amounts to integer cents (truncates to avoid double-conversion errors)
     * 2. Calculates the rounding gap between the rounded sum and the receipt total
     * 3. Sorts people by largest fractional part (those with the most "leftover" cents get priority)
     * 4. Distributes extra/missing pennies one at a time, cycling through people
     * 5. Converts back to dollars (Decimal instances)
     *
     * Uses Decimal.js throughout to maintain precision during the rounding and distribution process.
     *
     * @param receiptTotal - The total receipt amount as a Decimal instance
     * @param personTotals - Map of person identifiers to their calculated totals (as Decimal instances)
     * @returns A Map where keys are person identifiers and values are "fair" totals as Decimal instances.
     *          The sum of these fair totals equals the receipt total (within 1 cent).
     *
     * @example
     * ```ts
     * // Receipt total: $31.00
     * // Person totals: [10.333, 10.333, 10.334] (sum = 31.00)
     * // After rounding: [10.33, 10.33, 10.34] (sum = 31.00) ✓
     *
     * const receiptTotal = new Decimal(31.00);
     * const personTotals = new Map([
     *   ['Alice', new Decimal(10.333)],
     *   ['Bob', new Decimal(10.333)],
     *   ['Charlie', new Decimal(10.334)]
     * ]);
     * const fairTotals = calculations.final.getPersonFairTotals(receiptTotal, personTotals);
     * // Returns: Map([
     * //   ['Alice', new Decimal(10.33)],
     * //   ['Bob', new Decimal(10.33)],
     * //   ['Charlie', new Decimal(10.34)]
     * // ])
     * // Sum: 10.33 + 10.33 + 10.34 = 31.00 ✓
     *
     * // Example with rounding gap
     * // Receipt total: $10.00
     * // Person totals: [3.333, 3.333, 3.334] (sum = 10.00)
     * // After rounding: [3.33, 3.33, 3.33] (sum = 9.99) - gap of 1 cent
     * // Fair totals: [3.33, 3.33, 3.34] (sum = 10.00) - penny goes to person with largest fractional part
     * ```
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
      const roundedSumCents = inCents.length
        ? Decimal.sum(...inCents.map(({ cents }) => cents))
        : new Decimal(0);
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
      people: readonly string[],
      assignedPeople: readonly string[],
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

    /**
     * Formats the percentage that a partial value represents of a total value.
     * Returns a locale-aware formatted percentage string (e.g., "25.50%").
     *
     * The calculation is: (partial / total) * 100, then formatted using Intl.NumberFormat
     * with the 'percent' style for proper locale-aware display.
     *
     * Uses Decimal.js for precise division to avoid floating-point rounding errors.
     * If the total is zero or negative, returns "0%" and logs a warning.
     *
     * @param partial - The partial value to calculate the percentage for (as a Decimal instance)
     * @param total - The total value to use as the denominator (as a Decimal instance)
     * @returns A formatted percentage string (e.g., "25.50%", "0%"). Returns "0%" if total is zero or negative.
     *
     * @example
     * ```ts
     * // Format what percentage $25.50 is of $100.00
     * const percentage = calculations.utils.formatPercentage(
     *   new Decimal(25.50),
     *   new Decimal(100.00)
     * );
     * // Returns: "25.5%"
     *
     * // Format what percentage $33.33 is of $99.99
     * const percentage = calculations.utils.formatPercentage(
     *   new Decimal(33.33),
     *   new Decimal(99.99)
     * );
     * // Returns: "33.33%"
     *
     * // Returns "0%" if total is zero (logs warning)
     * const percentage = calculations.utils.formatPercentage(
     *   new Decimal(10),
     *   new Decimal(0)
     * );
     * // Returns: "0%"
     * ```
     */
    export function formatPercentage(partial: Decimal, total: Decimal): string {
      // TODO internationalize
      const formatter = new Intl.NumberFormat('en-US', { style: 'percent' });

      if (!total.gt(0)) {
        // TODO use observability library to log this
        console.warn('Total is zero');
        return formatter.format(0);
      }

      return formatter.format(Decimal.div(partial, total).toNumber());
    }
  }
}
