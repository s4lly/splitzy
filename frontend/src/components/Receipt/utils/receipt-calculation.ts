import Decimal from 'decimal.js';

import { itemHasCustomShares } from '@/features/line-items/utils/rebalance-shares';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

import { receiptHasLineItems } from './receipt-conditions';

/**
 * Person identifier type.
 *
 * The identifier is a `receiptUserId` — a ULID string generated client-side
 * when a receipt user is created. It is stable across a receipt's lifetime
 * and is the key used everywhere per-person math keys off.
 *
 * @example
 * ```ts
 * const personId: PersonIdentifier = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
 * ```
 */
export type PersonIdentifier = string;

/**
 * Item identifier type.
 *
 * A UUID v4 string that identifies a single line item within a receipt.
 * Matches `receipt_line_items.id` in the database.
 *
 * @example
 * ```ts
 * const itemId: ItemIdentifier = '550e8400-e29b-41d4-a716-446655440000';
 * ```
 */
export type ItemIdentifier = string;

/**
 * The price × quantity pair used to compute an item's total.
 *
 * `ReceiptLineItem` is structurally compatible with this type, so anywhere
 * the calc layer accepts an `ItemQuantityPrice` it can also accept the full
 * line item directly. It's also the shape used for the `candidate` override
 * on {@link calculations.pretax.getIndividualItemTotalPrice} when the user
 * is editing a form and we need a preview total from the in-flight values
 * before they've been persisted.
 *
 * Both fields are `Decimal` for exact arithmetic — never mix with `number`
 * multiplication or you'll reintroduce floating-point drift.
 */
export type ItemQuantityPrice = {
  /** Unit price of the item, in dollars. */
  pricePerItem: Decimal;
  /** Number of units. Typically an integer but stored as Decimal to match the DB schema. */
  quantity: Decimal;
};

/**
 * Per-person responsibility for a single line item.
 *
 * A `SplitShare` describes **how much of a given item one person owes**.
 * Every assigned person on a given line item carries a `SplitShare`; the
 * shares for a single item are expected to sum to the full item total.
 *
 * Variants:
 * - `even` — this person gets `itemTotal / groupSize`. Used when nobody on
 *   the item has a custom `sharePercentage` set. No extra data needed; the
 *   group size is derived from the containing map's `.size`.
 * - `percent` — this person gets `itemTotal × percent / 100`. The `percent`
 *   field is a `Decimal` in the inclusive range `[0, 100]` (not a fraction).
 *   Used when any assignment on the item has a non-null `sharePercentage`,
 *   which switches the whole item into custom-share mode.
 *
 * @example
 * ```ts
 * const even: SplitShare = { type: 'even' };
 * const percent: SplitShare = { type: 'percent', percent: new Decimal(56) };
 * ```
 */
export type SplitShare =
  | { type: 'even' }
  | { type: 'percent'; percent: Decimal };

/**
 * A single person's participation in a single line item, as surfaced by
 * {@link calculations.pretax.createItemSplitsFromAssignments} under
 * `ItemSplits.individuals`.
 *
 * The `item` reference lets downstream calculators reach `pricePerItem` /
 * `quantity` without a second lookup. The `type` is a narrow
 * {@link ItemSplitType} (no 'proportional'/'custom' — those only apply to
 * receipt-level distribution of tax/tip/gratuity).
 *
 * @example
 * ```ts
 * const split: IndividualSplit = { item: lineItem, type: 'percent' };
 * ```
 */
export type IndividualSplit = {
  /** The line item this person is assigned to. */
  item: ReceiptLineItem;
  /** How this person's share of the item is computed. */
  type: ItemSplitType;
};

/**
 * Structure organizing how line items are split among people.
 *
 * Two indexes over the same underlying data, kept in sync by
 * {@link calculations.pretax.createItemSplitsFromAssignments}:
 *
 * - `individuals` — person-centric. For each person, the list of items they
 *   participate in (plus the split type for each). Use this when iterating
 *   per-person (e.g. "what does Alice owe across all items?").
 * - `groups` — item-centric. For each item, a map from person ID to the
 *   specific {@link SplitShare} they carry on that item. The map's `.size`
 *   also serves as the group size used by `even` splits.
 *
 * @example
 * ```ts
 * // Two items: item1 shared between Alice & Bob with custom 60/40 shares,
 * // item2 assigned to just Bob (even by default).
 * const itemSplits: ItemSplits = {
 *   individuals: new Map([
 *     ['alice-ulid', [{ item: item1, type: 'percent' }]],
 *     ['bob-ulid', [
 *       { item: item1, type: 'percent' },
 *       { item: item2, type: 'even' },
 *     ]],
 *   ]),
 *   groups: new Map([
 *     ['item1-uuid', new Map([
 *       ['alice-ulid', { type: 'percent', percent: new Decimal(60) }],
 *       ['bob-ulid',   { type: 'percent', percent: new Decimal(40) }],
 *     ])],
 *     ['item2-uuid', new Map([
 *       ['bob-ulid', { type: 'even' }],
 *     ])],
 *   ]),
 * };
 * ```
 */
export type ItemSplits = {
  /** Person-indexed view: each person → list of items they're on. */
  individuals: Map<PersonIdentifier, IndividualSplit[]>;
  /** Item-indexed view: each item → per-person share map (size = group size). */
  groups: Map<ItemIdentifier, Map<PersonIdentifier, SplitShare>>;
};

/**
 * How a single line item is split among the people assigned to it.
 *
 * - `'even'` — divide the item total equally among all assigned people.
 * - `'percent'` — use each assignment's `sharePercentage` to weight the
 *   division (custom-share mode).
 *
 * This is intentionally narrower than {@link DistributionSplitType}:
 * per-item splits never use `'proportional'` (that concept only applies
 * receipt-wide, to distribute tax across items).
 */
export type ItemSplitType = 'even' | 'percent';

/**
 * How a receipt-level amount (tax / tip / gratuity) is distributed across
 * people who already have pre-tax item subtotals.
 *
 * - `'even'` — split the amount equally among all assigned people.
 * - `'proportional'` — each person's share is proportional to their
 *   pre-tax item subtotal. Typical for tax, where a bigger eater pays more
 *   tax. See {@link calculations.final.getPersonTotals} for the formula.
 * - `'custom'` — reserved for future per-item or per-person overrides;
 *   currently logs a warning and is a no-op.
 */
export type DistributionSplitType = 'even' | 'proportional' | 'custom';

/**
 * Map from person identifier to a dollar amount. Used throughout the calc
 * layer as the canonical "how much does each person owe" return shape.
 *
 * The map's insertion order is not meaningful — callers should treat it
 * as an unordered dictionary.
 */
export type PersonTotals = Map<PersonIdentifier, Decimal>;

/**
 * Options for {@link calculations.final.getPersonTotals}.
 *
 * All three split-type fields are optional and fall back to sensible
 * defaults (tax: proportional, tip/gratuity: even) so callers only need
 * to specify what they want to change.
 */
export type GetPersonTotalsOptions = {
  /** Item-to-person split graph produced by {@link calculations.pretax.createItemSplitsFromAssignments}. */
  itemSplits: ItemSplits;
  /** How to distribute `receipt.tax`. Defaults to `'proportional'`. */
  taxSplitType?: DistributionSplitType;
  /** How to distribute `receipt.tip`. Defaults to `'even'`. Only `'even'` is currently implemented. */
  tipSplitType?: DistributionSplitType;
  /** How to distribute `receipt.gratuity`. Defaults to `'even'`. Only `'even'` is currently implemented. */
  gratuitySplitType?: DistributionSplitType;
};

const DEFAULT_SPLIT_TYPE: ItemSplitType = 'even';

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
     * Computes an item's total price as `pricePerItem × quantity`.
     *
     * This is the single source of truth for an item's total across the
     * calc layer. The persisted `total_price` column is a denormalized
     * mirror, refreshed by {@link useLineItemMutations.handleUpdateLineItem}
     * on every edit and repaired by the one-time Alembic migration
     * `reconcile_line_item_total_price_to_price_per_item_x_quantity`; this
     * function intentionally ignores it to stay consistent with whatever
     * the user sees in the edit form.
     *
     * When `candidate` is passed, it shadows the item's own values. That
     * supports live previews while the user is typing into the edit form:
     * pass the in-flight `{ pricePerItem, quantity }` and you get the
     * preview total without having to persist first.
     *
     * @param item - The line item. Only `pricePerItem` and `quantity` are read.
     * @param candidate - Optional override (typically in-flight form values).
     * @returns The item total as a `Decimal` instance, using exact arithmetic.
     *
     * @example
     * ```ts
     * // Persisted values path
     * const item = {
     *   pricePerItem: new Decimal('9.99'),
     *   quantity: new Decimal(2),
     *   // ...other ReceiptLineItem fields
     * };
     * calculations.pretax.getIndividualItemTotalPrice(item);
     * // => new Decimal('19.98')
     *
     * // Form-preview path: candidate wins
     * calculations.pretax.getIndividualItemTotalPrice(item, {
     *   pricePerItem: new Decimal('10.00'),
     *   quantity: new Decimal(3),
     * });
     * // => new Decimal('30.00')
     * ```
     */
    export function getIndividualItemTotalPrice(
      item: ReceiptLineItem,
      candidate?: ItemQuantityPrice
    ): Decimal {
      const source = candidate ?? item;
      return source.pricePerItem.mul(source.quantity);
    }

    /**
     * Sums {@link getIndividualItemTotalPrice} across every line item on
     * the receipt. This is the pre-tax subtotal used everywhere — tax
     * distribution, receipt grand total, assignment-free even split,
     * and the "Subtotal" row on the bill-breakdown dialog.
     *
     * Includes all line items regardless of assignment state: an item with
     * no assignees still contributes to the subtotal.
     *
     * @param receipt - The receipt whose `lineItems` will be summed.
     * @returns A `Decimal` sum. `Decimal(0)` when `receipt.lineItems` is empty.
     *
     * @example
     * ```ts
     * // Receipt with three items whose pricePerItem × quantity evaluate to
     * // $10.50, $5.25, and $3.75 respectively.
     * calculations.pretax.getTotalForAllItems(receipt);
     * // => new Decimal('19.50')
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
     * Computes what one person owes for one line item.
     *
     * Two modes, chosen automatically per item:
     * - **Custom-share mode** (any assignment on the item has a non-null
     *   `sharePercentage`): returns `itemTotal × sharePercentage / 100`.
     *   A missing `sharePercentage` on a particular assignment in this
     *   mode is treated as `0%`.
     * - **Even mode** (no custom shares on the item): returns
     *   `itemTotal / assignments.length`.
     *
     * Returns `Decimal(0)` if the item has no assignments, or if the
     * requested person isn't assigned to this item.
     *
     * The optional `candidate` is forwarded to
     * {@link getIndividualItemTotalPrice} and is used to drive live
     * previews while the user is editing item price/quantity.
     *
     * @param item - The line item, including its `assignments` array.
     * @param person - The person's {@link PersonIdentifier} (ULID).
     * @param options - `candidate` override for the item total.
     * @returns A `Decimal` amount — the person's share for this item.
     *
     * @example
     * ```ts
     * // Even split: $30 item shared by two people
     * calculations.pretax.getPersonTotalForItem(item, '01ARZ...FAV');
     * // => new Decimal('15')
     *
     * // Custom shares: $100 item, Bill=56%, others=15/15/14
     * calculations.pretax.getPersonTotalForItem(itemWithShares, 'bill-ulid');
     * // => new Decimal('56')
     *
     * // Not assigned
     * calculations.pretax.getPersonTotalForItem(item, 'stranger-ulid');
     * // => new Decimal('0')
     * ```
     */
    export function getPersonTotalForItem(
      item: ReceiptLineItem,
      person: PersonIdentifier,
      options?: {
        /** Optional in-flight form values; see {@link ItemQuantityPrice}. */
        candidate?: ItemQuantityPrice;
      }
    ): Decimal {
      const activeAssignments = item.assignments.filter((a) => !a.deletedAt);
      const assignment = activeAssignments.find(
        (a) => a.receiptUserId === person
      );

      if (activeAssignments.length === 0 || !assignment) {
        return new Decimal(0);
      }

      const itemTotalPrice = getIndividualItemTotalPrice(
        item,
        options?.candidate
      );

      if (itemHasCustomShares(activeAssignments)) {
        if (assignment.sharePercentage == null) {
          console.warn(
            'Missing sharePercentage on custom-share item; treating as 0%',
            { itemId: item.id, receiptUserId: assignment.receiptUserId }
          );
        }
        const percent = assignment.sharePercentage ?? new Decimal(0);
        return itemTotalPrice.mul(percent).div(new Decimal(100));
      }

      return itemTotalPrice.div(new Decimal(activeAssignments.length));
    }

    /**
     * Builds an {@link ItemSplits} graph from a collection of line items.
     *
     * For each line item the function decides the split mode:
     * - If **any** active assignment on that item has a non-null
     *   `sharePercentage`, the whole item is in `percent` mode — every
     *   assignment on that item gets a `{ type: 'percent', percent }` share
     *   (`percent` defaults to `0` when an individual `sharePercentage` is
     *   null; rebalance logic is expected to have set these before we get
     *   here).
     * - Otherwise the item is in `even` mode — every assignment gets
     *   `{ type: 'even' }` and the group size is derived from the map size.
     *
     * Both indexes (`individuals`, `groups`) are populated in a single pass
     * and kept in sync.
     *
     * @param lineItems - The receipt's line items with their assignments.
     * @returns An {@link ItemSplits} graph ready to hand to the total calculators.
     *
     * @example
     * ```ts
     * // item1: even split Alice/Bob. item2: custom shares Bob=70%, Carol=30%.
     * const splits = calculations.pretax.createItemSplitsFromAssignments(lineItems);
     * // splits.individuals: Map([
     * //   ['alice-ulid', [{ item: item1, type: 'even' }]],
     * //   ['bob-ulid',   [{ item: item1, type: 'even' }, { item: item2, type: 'percent' }]],
     * //   ['carol-ulid', [{ item: item2, type: 'percent' }]],
     * // ])
     * // splits.groups: Map([
     * //   ['item1-uuid', Map([
     * //     ['alice-ulid', { type: 'even' }],
     * //     ['bob-ulid',   { type: 'even' }],
     * //   ])],
     * //   ['item2-uuid', Map([
     * //     ['bob-ulid',   { type: 'percent', percent: new Decimal(70) }],
     * //     ['carol-ulid', { type: 'percent', percent: new Decimal(30) }],
     * //   ])],
     * // ])
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
        const activeAssignments = lineItem.assignments.filter(
          (a) => !a.deletedAt
        );
        const customShares = itemHasCustomShares(activeAssignments);

        for (const assignment of activeAssignments) {
          const personIdentifier = assignment.receiptUserId;
          let personSplits = splits.individuals.get(personIdentifier);

          if (!personSplits) {
            personSplits = [];
            splits.individuals.set(personIdentifier, personSplits);
          }

          personSplits.push({
            item: lineItem,
            type: customShares ? 'percent' : DEFAULT_SPLIT_TYPE,
          });

          let groupShares = splits.groups.get(lineItem.id);

          if (!groupShares) {
            groupShares = new Map();
            splits.groups.set(lineItem.id, groupShares);
          }

          if (customShares && assignment.sharePercentage == null) {
            console.warn(
              'Missing sharePercentage on custom-share item; treating as 0%',
              { itemId: lineItem.id, receiptUserId: personIdentifier }
            );
          }

          groupShares.set(
            personIdentifier,
            customShares
              ? {
                  type: 'percent',
                  percent: assignment.sharePercentage ?? new Decimal(0),
                }
              : { type: 'even' }
          );
        }
      }

      return splits;
    }

    /**
     * Sums each person's pre-tax share across every item they're on.
     *
     * Walks `itemSplits.individuals` and, for each `IndividualSplit`,
     * accumulates the person's dollar share:
     * - `even` → `itemTotal / groupSize` (group size from `itemSplits.groups`)
     * - `percent` → `itemTotal × percent / 100` (percent from the matching
     *   `SplitShare` in `itemSplits.groups`)
     *
     * Note that receipt-level distribution modes (`'proportional'`,
     * `'custom'`) don't apply here — those are {@link DistributionSplitType}
     * values handled by {@link calculations.final.getPersonTotals}.
     *
     * The result is a fresh {@link PersonTotals} map; callers may mutate
     * it freely (e.g. to layer on tax/tip) without affecting the input.
     *
     * @throws `Error('Group size not found')` when an even-split item has
     *   no group entry — indicates a bug in the upstream graph builder.
     * @throws `Error('Percent share not found')` when a percent split has
     *   no matching percent entry in `groups` — same invariant violation.
     *
     * @param itemSplits - The graph from {@link createItemSplitsFromAssignments}.
     * @returns A {@link PersonTotals} map of `receiptUserId → pre-tax dollars`.
     *
     * @example
     * ```ts
     * // Two items: $30 even split between Alice & Bob; $50 all on Bob.
     * calculations.pretax.getAllPersonItemTotals(itemSplits);
     * // => Map([
     * //   ['alice-ulid', new Decimal('15')],
     * //   ['bob-ulid',   new Decimal('65')],
     * // ])
     *
     * // Custom shares: $100 item Bill=56%, Bob=15%, Nyle=15%, Janis=14%.
     * calculations.pretax.getAllPersonItemTotals(customShareSplits);
     * // => Map([
     * //   ['bill-ulid',  new Decimal('56')],
     * //   ['bob-ulid',   new Decimal('15')],
     * //   ['nyle-ulid',  new Decimal('15')],
     * //   ['janis-ulid', new Decimal('14')],
     * // ])
     * ```
     */
    export function getAllPersonItemTotals(
      itemSplits: ItemSplits
    ): PersonTotals {
      const personItemTotals: PersonTotals = new Map();

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

              const splitValue = getIndividualItemTotalPrice(item).div(
                new Decimal(groupSize)
              );

              personItemTotals.set(
                personIdentifier,
                Decimal.add(
                  personItemTotals.get(personIdentifier) ?? new Decimal(0),
                  splitValue
                )
              );
              break;
            }

            case 'percent': {
              const { item } = individualSplit;
              const share = itemSplits.groups
                .get(item.id)
                ?.get(personIdentifier);

              if (!share || share.type !== 'percent') {
                throw new Error('Percent share not found');
              }

              const splitValue = getIndividualItemTotalPrice(item)
                .mul(share.percent)
                .div(new Decimal(100));

              personItemTotals.set(
                personIdentifier,
                Decimal.add(
                  personItemTotals.get(personIdentifier) ?? new Decimal(0),
                  splitValue
                )
              );
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
     * Computes the effective tax rate as a decimal fraction, e.g. `0.10`
     * for a 10% receipt.
     *
     * Formula: `receipt.tax / pretax.getTotalForAllItems(receipt)`.
     * Uses the live items subtotal (not any frozen OCR `displaySubtotal`)
     * so the rate stays consistent after the user edits items.
     *
     * **Informational only.** Receipt-level tax distribution in
     * {@link calculations.final.getPersonTotals} distributes
     * `receipt.tax` by proportion of assigned items; it does not re-apply
     * this rate. This helper exists for display (tax badge on the summary
     * card) and for future tax-editor UIs.
     *
     * @param receipt - The receipt with `tax` and `lineItems`.
     * @returns `Decimal` fraction (e.g. `0.08` = 8%). `Decimal(0)` when
     *   tax is missing/zero or when there are no line items.
     *
     * @example
     * ```ts
     * // Items $100, tax $8
     * calculations.tax.getRate(receipt);
     * // => new Decimal('0.08')
     * ```
     */
    export function getRate(receipt: Receipt): Decimal {
      if (!receipt.tax || receipt.tax.isZero()) {
        return new Decimal(0);
      }

      const itemsTotal = pretax.getTotalForAllItems(receipt);
      if (itemsTotal.isZero()) {
        return new Decimal(0);
      }

      return receipt.tax.div(itemsTotal);
    }
  }

  /**
   * Final/post-tax calculation functions.
   * These functions work with amounts after tax, tip, and gratuity are applied.
   */
  export namespace final {
    /**
     * Computes the receipt grand total:
     * `sum(items) + tax + tip + gratuity`.
     *
     * Notes on the inputs:
     * - `tax` is added as a flat amount (`receipt.tax`), not re-derived from
     *   a rate. When `taxIncludedInItems` is true the tax term is skipped
     *   entirely (the tax is already baked into each item's price).
     * - Missing `tax`, `tip`, or `gratuity` are treated as zero.
     * - When `receipt.lineItems` is empty the function short-circuits to
     *   `Decimal(0)` — tax/tip/gratuity without items is considered a
     *   degenerate receipt (not yet OCR'd) and rendered as zero.
     *
     * Used by {@link getPersonTotals} when no items are assigned (fallback
     * to equal-split of the full receipt total) and by the receipt
     * summary card for "Total".
     *
     * @param receipt - The receipt with line items and optional tax/tip/gratuity.
     * @returns `Decimal` grand total, or `Decimal(0)` if there are no items.
     *
     * @example
     * ```ts
     * // Items $100, tax $10, tip $5, gratuity $2
     * calculations.final.getReceiptTotal(receipt);
     * // => new Decimal('117')
     *
     * // taxIncludedInItems=true skips the tax term
     * calculations.final.getReceiptTotal(receiptWithInclusiveTax);
     * // => items + tip + gratuity (no extra tax added)
     * ```
     */
    export function getReceiptTotal(receipt: Receipt): Decimal {
      let total = new Decimal(0);

      if (!(receipt.lineItems && receipt.lineItems.length > 0)) {
        return total;
      }

      // derived
      total = total.plus(pretax.getTotalForAllItems(receipt));

      if (!receipt.taxIncludedInItems) {
        total = total.plus(receipt.tax ?? new Decimal(0));
      }

      // pulled from receipt
      total = total.plus(receipt.gratuity ?? new Decimal(0));
      total = total.plus(receipt.tip ?? new Decimal(0));

      return total;
    }

    /**
     * Computes the final per-person total (items + tax + tip + gratuity).
     *
     * Build order:
     * 1. Seed with each person's pre-tax item total from
     *    {@link calculations.pretax.getAllPersonItemTotals}.
     * 2. Add tax (skipped if `receipt.taxIncludedInItems` is true or there
     *    are no line items):
     *    - Effective tax is scaled by assigned-fraction of total items:
     *      `receipt.tax × (sumAssigned / sumAllItems)`. When all items are
     *      assigned this equals `receipt.tax` exactly; when some items are
     *      unassigned only the attributable portion of tax is distributed.
     *    - `'proportional'` (default): each person's tax share is weighted
     *      by their pre-tax item subtotal.
     *    - `'even'`: tax divided equally among people who have any item.
     *    - `'custom'`: no-op with warning.
     * 3. Add tip (`receipt.tip`, if set) divided by `tipSplitType`.
     *    Only `'even'` is implemented today; other modes warn and skip.
     * 4. Add gratuity (`receipt.gratuity`, if set) divided by
     *    `gratuitySplitType`. Same caveat as tip.
     *
     * The returned map is a fresh copy — safe to mutate in callers.
     *
     * The sum of all person totals should equal
     * {@link getReceiptTotal}(receipt) when every item is assigned. When
     * items are unassigned the difference is the unassigned-item portion
     * of items + the matching proportional slice of tax.
     *
     * @param receipt - The receipt with its line items, tax, tip, gratuity.
     * @param options - {@link GetPersonTotalsOptions}.
     * @returns A fresh {@link PersonTotals} map keyed by `receiptUserId`.
     *
     * @example
     * ```ts
     * // Alice on a $50 item, Bob on a $30 item. tax=$8, tip=$5, gratuity=$2.
     * const totals = calculations.final.getPersonTotals(receipt, {
     *   itemSplits,
     *   taxSplitType: 'proportional',
     * });
     * // Alice: 50 + (8 * 50/80) + 5/2 + 2/2 = 50 + 5 + 2.5 + 1 = 58.50
     * // Bob:   30 + (8 * 30/80) + 5/2 + 2/2 = 30 + 3 + 2.5 + 1 = 36.50
     * // => Map([
     * //   ['alice-ulid', new Decimal('58.5')],
     * //   ['bob-ulid',   new Decimal('36.5')],
     * // ])
     *
     * // Custom shares respected end-to-end: $100 item Bill=56%, Bob=15%,
     * // Nyle=15%, Janis=14% → Bill's row shows $56 before tax/tip.
     * ```
     */
    export function getPersonTotals(
      receipt: Receipt,
      {
        itemSplits,
        taxSplitType = 'proportional',
        tipSplitType = 'even',
        gratuitySplitType = 'even',
      }: GetPersonTotalsOptions
    ): PersonTotals {
      const hasLineItems = receiptHasLineItems(itemSplits);

      // Clone the map returned by getAllPersonItemTotals so we don't mutate
      // the caller-visible pretax totals when adding tax/tip/gratuity.
      const personTotals = new Map(pretax.getAllPersonItemTotals(itemSplits));

      // --

      if (hasLineItems && !receipt.taxIncludedInItems) {
        // get the total value of all assigned items
        const totalAssignedItemsValue = personTotals.size
          ? Decimal.sum(...Array.from(personTotals.values()))
          : new Decimal(0);

        // Distribute receipt.tax directly by proportion — no rate indirection.
        // When all items are assigned, totalAssignedItemsValue === totalItemsValue,
        // so taxAmount === receipt.tax. When some items are unassigned, only the
        // fraction of receipt.tax attributable to assigned items is distributed.
        const totalItemsValue = pretax.getTotalForAllItems(receipt);
        const receiptTax = receipt.tax ?? new Decimal(0);
        const taxAmount = totalItemsValue.isZero()
          ? new Decimal(0)
          : receiptTax.mul(totalAssignedItemsValue.div(totalItemsValue));

        switch (taxSplitType) {
          case 'even': {
            if (personTotals.size === 0) break;
            const taxPerPerson = taxAmount.div(new Decimal(personTotals.size));

            for (const [personIdentifier, itemTotal] of personTotals) {
              personTotals.set(personIdentifier, itemTotal.add(taxPerPerson));
            }

            break;
          }

          case 'proportional': {
            for (const [personIdentifier, itemTotal] of personTotals) {
              const burden = totalAssignedItemsValue.isZero()
                ? new Decimal(0)
                : itemTotal.div(totalAssignedItemsValue);
              const personTaxAmount = taxAmount.mul(burden);

              personTotals.set(
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
            if (personTotals.size === 0) break;
            const tipPerPerson = receipt.tip.div(
              new Decimal(personTotals.size)
            );

            for (const [personIdentifier, itemTotal] of personTotals) {
              personTotals.set(personIdentifier, itemTotal.add(tipPerPerson));
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
            if (personTotals.size === 0) break;
            const gratuityPerPerson = receipt.gratuity.div(
              new Decimal(personTotals.size)
            );

            for (const [personIdentifier, itemTotal] of personTotals) {
              personTotals.set(
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

      return personTotals;
    }

    /**
     * Rounds per-person values to whole cents and distributes the rounding
     * drift so the rounded totals still sum to exactly `targetSum`.
     *
     * Used at the very end of the pipeline so that the per-person dollar
     * amounts displayed to the user add up to the receipt total with zero
     * pennies missing or extra. Largest-remainder method: whoever had the
     * biggest fractional cent before rounding is first in line for any
     * orphaned pennies.
     *
     * `targetSum` is deliberately decoupled from the receipt total —
     * callers pass whatever sum they want the rounded outputs to hit.
     * Typical choices are the unrounded sum of `personTotals` or the
     * receipt's `getReceiptTotal`.
     *
     * **Algorithm:**
     * 1. Truncate each amount to integer cents.
     * 2. Compute `diff = targetSumCents − sum(trunc)`.
     * 3. Sort by descending fractional-cent part.
     * 4. Add (or subtract, if `diff < 0`) one cent at a time, cycling
     *    through the sorted list, until `diff` closes.
     * 5. Convert back to dollars.
     *
     * See the in-function comment for why truncation beats `round` here.
     *
     * @param targetSum - The exact total the rounded outputs must sum to.
     * @param personTotals - {@link PersonTotals} of un-rounded amounts.
     * @returns Fresh {@link PersonTotals} of whole-cent amounts summing to `targetSum`.
     *
     * @example
     * ```ts
     * // Target $10.00, three people at ~$3.333 each.
     * calculations.final.getPersonFairTotals(new Decimal('10'), new Map([
     *   ['a', new Decimal('3.333')],
     *   ['b', new Decimal('3.333')],
     *   ['c', new Decimal('3.334')],
     * ]));
     * // => Map([
     * //   ['c', new Decimal('3.34')],  // biggest fractional → gets the extra penny
     * //   ['a', new Decimal('3.33')],
     * //   ['b', new Decimal('3.33')],
     * // ])
     * // Sum: 3.34 + 3.33 + 3.33 = 10.00
     * ```
     */
    export function getPersonFairTotals(
      targetSum: Decimal,
      personTotals: PersonTotals
    ): PersonTotals {
      // Step 1: Convert to cents.
      //
      // We truncate (floor toward zero) rather than rounding to the nearest cent
      // here, and that is intentional:
      //
      // 1. Every person's initial rounded value is <= their unrounded value,
      //    so the penny-distribution loop below only ever needs to ADD pennies
      //    (when targetSum > sum(trunc)) or, for negative targets, subtract.
      //    This keeps the loop direction consistent and avoids the case where
      //    half-even rounding overshoots targetSum and we'd need to claw pennies
      //    back from people who already got "lucky" on rounding.
      //
      // 2. The fairness guarantee is provided by the sort-by-largest-remainder
      //    step (line below): the people whose unrounded values had the biggest
      //    fractional part are first in line to receive the drift pennies. If
      //    we rounded first, the fractional part we'd need to sort by is the
      //    ORIGINAL fractional part (pre-rounding), not the post-rounding
      //    residue — so switching to banker's rounding doesn't change the
      //    fairness of the allocation, only the starting point.
      //
      // 3. The final sum is guaranteed to equal targetSum regardless of
      //    rounding mode, because the loop explicitly closes the gap.
      //
      // Truncation is simpler to reason about and the tests exercise this
      // behavior directly; switching to Decimal.ROUND_HALF_EVEN would require
      // re-validating the sort ordering and bidirectional penny distribution.
      const inCents = Array.from(personTotals).map(([userId, value]) => ({
        userId,
        original: value,
        cents: new Decimal(value).mul(100).trunc(),
      }));

      // Step 2: Calculate rounding gap in cents
      const roundedSumCents = inCents.length
        ? Decimal.sum(...inCents.map(({ cents }) => cents))
        : new Decimal(0);
      const targetSumCents = targetSum.mul(100).trunc();
      let diffCents = targetSumCents.minus(roundedSumCents);

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
      const result: PersonTotals = new Map(
        inCents.map(({ userId, cents }) => [userId, cents.div(100)])
      );

      return result;
    }
  }

  /**
   * Utility functions for receipt calculations.
   */
  export namespace utils {
    /**
     * Returns the subset of `people` who are **not** already in
     * `assignedPeople`. Used by the assignment picker to populate the
     * "people you haven't added yet" list on a line item.
     *
     * Name-based search filtering is done one level up in the UI, where
     * display names are available — IDs here are ULIDs.
     *
     * @param people - All known receipt-user IDs (ULIDs) on the receipt.
     * @param assignedPeople - Receipt-user IDs already assigned to the item.
     * @returns IDs present in `people` but absent from `assignedPeople`.
     *
     * @example
     * ```ts
     * calculations.utils.filterPeople(
     *   ['alice-ulid', 'bob-ulid', 'carol-ulid'],
     *   ['bob-ulid'],
     * );
     * // => ['alice-ulid', 'carol-ulid']
     * ```
     */
    export function filterPeople(
      people: readonly PersonIdentifier[],
      assignedPeople: readonly PersonIdentifier[]
    ): PersonIdentifier[] {
      return people.filter((person) => !assignedPeople.includes(person));
    }

    /**
     * Formats `partial / total` as a locale-aware percentage string.
     *
     * Uses `Intl.NumberFormat` with `style: 'percent'`, capped at 2 decimal
     * places. Division is done in `Decimal.js` to avoid floating-point
     * drift before handing off to `toNumber()` for formatting.
     *
     * Guard behavior:
     * - If `total <= 0`, logs a warning and returns `'0%'` (locale-formatted).
     *   This protects against divide-by-zero when a receipt has no items
     *   yet or a caller passes a negative denominator by mistake.
     *
     * @param partial - Numerator, typically a person's portion.
     * @param total - Denominator, typically the receipt or item total.
     * @returns Formatted percentage string (e.g. `"25.5%"`, `"0%"`).
     *
     * @example
     * ```ts
     * calculations.utils.formatPercentage(new Decimal('25.5'), new Decimal('100'));
     * // => '25.5%'
     *
     * calculations.utils.formatPercentage(new Decimal('33.33'), new Decimal('99.99'));
     * // => '33.33%'
     *
     * calculations.utils.formatPercentage(new Decimal('10'), new Decimal('0'));
     * // => '0%' (also logs a warning)
     * ```
     */
    export function formatPercentage(partial: Decimal, total: Decimal): string {
      // TODO internationalize
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 2,
      });

      if (!total.gt(0)) {
        // TODO use observability library to log this
        console.warn('Total is zero');
        return formatter.format(0);
      }

      return formatter.format(Decimal.div(partial, total).toNumber());
    }
  }
}
