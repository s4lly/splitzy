import {
  calculations,
  PersonIdentifier,
} from '@/components/Receipt/utils/receipt-calculation';
import {
  areAllItemsAssigned,
  hasLineItems,
  shouldUseEqualSplit,
} from '@/components/Receipt/utils/receipt-conditions';
import { ReceiptWithLineItems } from '@/context/ReceiptContext';
import Decimal from 'decimal.js';
import { atom } from 'jotai';

// =============================================================================
// Base Atom (synced from ReceiptContext)
// =============================================================================

/**
 * Base atom that holds the receipt data from Zero.
 * This is synced from ReceiptContext via useReceiptSync hook.
 */
export const receiptAtom = atom<ReceiptWithLineItems | null>(null);

// =============================================================================
// Read-Only Derived Atoms
// =============================================================================

/**
 * Derives line items from the receipt for convenience
 */
export const lineItemsAtom = atom((get) => {
  const receipt = get(receiptAtom);
  return receipt?.line_items ?? [];
});

/**
 * Creates the ItemSplits structure from line item assignments.
 * This organizes which people are assigned to which items.
 */
export const itemSplitsAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return null;

  // Convert readonly array to mutable for the calculation function
  const lineItems = [...receipt.line_items].map((item) => ({
    ...item,
    name: item.name ?? '',
    assignments: (item.assignments as string[]) ?? [],
  }));

  return calculations.pretax.createItemSplitsFromAssignments(lineItems);
});

/**
 * Pre-tax item totals for each person (without tax, tip, gratuity)
 */
export const personPretaxTotalsAtom = atom((get) => {
  const itemSplits = get(itemSplitsAtom);
  if (!itemSplits) return new Map<PersonIdentifier, Decimal>();
  return calculations.pretax.getAllPersonItemTotals(itemSplits);
});

/**
 * Total of all line items (pre-tax, pre-tip, pre-gratuity)
 */
export const itemsTotalAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return new Decimal(0);

  const receiptData = buildReceiptData(receipt);
  return calculations.pretax.getTotalForAllItems(receiptData);
});

/**
 * Total receipt amount including all items, tax, tip, and gratuity
 */
export const receiptTotalAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return new Decimal(0);

  // Build receipt_data structure expected by calculations
  const receiptData = buildReceiptData(receipt);
  return calculations.final.getReceiptTotal(receiptData);
});

/**
 * Whether the receipt has line items
 */
export const hasLineItemsAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return false;

  const receiptData = buildReceiptData(receipt);
  return hasLineItems(receiptData);
});

/**
 * Whether equal split mode should be used
 */
export const useEqualSplitAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return true;

  const receiptData = buildReceiptData(receipt);
  return shouldUseEqualSplit(receiptData);
});

/**
 * Whether all items are fully assigned
 */
export const isFullyAssignedAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return false;

  const receiptData = buildReceiptData(receipt);
  return areAllItemsAssigned(receiptData);
});

// =============================================================================
// Writable Derived Atoms (can be overridden)
// =============================================================================

/**
 * Base atom for person totals override.
 * When null, personTotalsAtom computes from receipt.
 */
const personTotalsOverrideAtom = atom<Map<PersonIdentifier, Decimal> | null>(
  null
);

/**
 * Person totals - amount each person owes.
 * Can be read (computed or overridden) or written (to override).
 * Set to null to reset to computed value.
 */
export const personTotalsAtom = atom(
  (get) => {
    const override = get(personTotalsOverrideAtom);
    if (override) return override;

    // Default: compute from receipt
    const receipt = get(receiptAtom);
    const itemSplits = get(itemSplitsAtom);
    if (!receipt || !itemSplits) return new Map<PersonIdentifier, Decimal>();

    const receiptData = buildReceiptData(receipt);
    return calculations.final.getPersonTotals(receiptData, { itemSplits });
  },
  (_get, set, newValue: Map<PersonIdentifier, Decimal> | null) => {
    set(personTotalsOverrideAtom, newValue);
  }
);

/**
 * Sum of all person totals
 */
export const personTotalsSumAtom = atom((get) => {
  const personTotals = get(personTotalsAtom);
  if (personTotals.size === 0) return new Decimal(0);
  return Decimal.sum(...Array.from(personTotals.values()));
});

/**
 * Base atom for fair totals override
 */
const personFairTotalsOverrideAtom = atom<Map<
  PersonIdentifier,
  Decimal
> | null>(null);

/**
 * Fair totals with proper rounding and penny distribution.
 * Can be overridden or computed.
 */
export const personFairTotalsAtom = atom(
  (get) => {
    const override = get(personFairTotalsOverrideAtom);
    if (override) return override;

    const personTotalsSum = get(personTotalsSumAtom);
    const personTotals = get(personTotalsAtom);

    if (personTotals.size === 0) return new Map<PersonIdentifier, Decimal>();

    return calculations.final.getPersonFairTotals(
      personTotalsSum,
      personTotals
    );
  },
  (_get, set, newValue: Map<PersonIdentifier, Decimal> | null) => {
    set(personFairTotalsOverrideAtom, newValue);
  }
);

/**
 * Unassigned amount (receipt total minus sum of person totals)
 */
export const unassignedAmountAtom = atom((get) => {
  const receiptTotal = get(receiptTotalAtom);
  const personTotalsSum = get(personTotalsSumAtom);
  return Decimal.max(0, receiptTotal.minus(personTotalsSum));
});

// =============================================================================
// People Management Atoms
// =============================================================================

/**
 * Base atom for the list of all people (including unassigned)
 */
const peopleOverrideAtom = atom<string[] | null>(null);

/**
 * List of all people involved in the receipt split.
 * Defaults to extracting from line item assignments.
 */
export const peopleAtom = atom(
  (get) => {
    const override = get(peopleOverrideAtom);
    if (override) return override;

    const receipt = get(receiptAtom);
    if (!receipt) return [];

    // Extract unique people from line item assignments
    const people = new Set<string>();
    for (const item of receipt.line_items) {
      const assignments = (item.assignments as string[]) ?? [];
      for (const person of assignments) {
        people.add(person);
      }
    }
    return Array.from(people);
  },
  (_get, set, newValue: string[] | null) => {
    set(peopleOverrideAtom, newValue);
  }
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Builds the receipt_data structure expected by calculation functions.
 *
 * This adapter function bridges two different data schemas:
 *
 * **Source: `ReceiptWithLineItems` (Zero schema)**
 * - Defined in: `@/zero/schema.ts` as `UserReceipt` + related `ReceiptLineItem[]`
 * - Origin: Database/Zero sync layer
 * - Nullability: Uses `optional()` which results in `T | undefined`
 * - Line items: Separate table with foreign key relationship
 * - Date field: Stored as `number` (timestamp)
 * - Assignments: Stored as `json()` type, needs casting to `string[]`
 *
 * **Target: `ReceiptData` (Zod ReceiptDataSchema)**
 * - Defined in: `@/lib/receiptSchemas.ts`
 * - Origin: API response / legacy receipt format
 * - Nullability: Uses `z.*.nullable()` which results in `T | null`
 * - Line items: Embedded array with required `name: string` and `assignments: string[]`
 * - Date field: Stored as `string | null`
 * - Has required fields: `is_receipt: boolean`, `tax_included_in_items: boolean`
 *
 * **Key differences to address in future refactoring:**
 *
 * 1. **Nullability convention**: Zero uses `undefined`, Zod schema uses `null`
 *    - Current fix: `?? null` coercion throughout
 *    - Future: Update calculation functions to accept `T | undefined | null`
 *
 * 2. **Required vs optional fields**:
 *    - `is_receipt`: Only in Zod schema, hardcoded to `true` here
 *    - `tax_included_in_items`: Required boolean in Zod, optional in Zero
 *    - Future: Consider if these fields should exist in Zero schema
 *
 * 3. **Date type mismatch**:
 *    - Zero: `number` (Unix timestamp)
 *    - Zod: `string | null` (formatted date string)
 *    - Current fix: `.toString()` conversion (loses formatting)
 *    - Future: Standardize on one format or add proper date formatting
 *
 * 4. **Line item differences**:
 *    - Zero `name`: `string | undefined` → Zod `name`: `string` (required)
 *    - Zero `assignments`: `json()` (unknown type) → Zod: `string[]` (required)
 *    - Current fix: Default to empty string/array
 *    - Future: Consider making Zero schema stricter or Zod schema more lenient
 *
 * 5. **Readonly arrays**:
 *    - Zero returns `readonly ReceiptLineItem[]`
 *    - Calculation functions expect mutable arrays
 *    - Current fix: Spread operator `[...receipt.line_items]`
 *    - Future: Update calculation functions to accept readonly arrays
 *
 * @param receipt - Receipt data from Zero's useQuery with related line items
 * @returns Object matching ReceiptDataSchema shape for use with calculation functions
 *
 * @see {@link @/zero/schema.ts} for Zero schema definitions
 * @see {@link @/lib/receiptSchemas.ts} for Zod schema definitions
 * @see {@link @/components/Receipt/utils/receipt-calculation.ts} for calculation functions
 *
 * @todo Refactor calculation functions to accept `ReceiptWithLineItems` directly,
 *       eliminating the need for this adapter. This would:
 *       - Remove runtime overhead of object transformation
 *       - Eliminate potential bugs from mapping mismatches
 *       - Simplify the data flow from Zero → atoms → calculations
 */
export function buildReceiptData(receipt: ReceiptWithLineItems) {
  return {
    // Required boolean fields - hardcoded since Zero schema doesn't have these
    is_receipt: true,
    tax_included_in_items: receipt.tax_included_in_items ?? false,

    // String fields: undefined → null coercion
    merchant: receipt.merchant ?? null,
    payment_method: receipt.payment_method ?? null,

    // Date: number (timestamp) → string conversion
    // TODO: Consider proper date formatting instead of .toString()
    date: receipt.date?.toString() ?? null,

    // Numeric fields: undefined → null coercion
    subtotal: receipt.subtotal ?? null,
    tax: receipt.tax ?? null,
    tip: receipt.tip ?? null,
    gratuity: receipt.gratuity ?? null,
    total: receipt.total ?? null,
    display_subtotal: receipt.display_subtotal ?? null,
    items_total: receipt.items_total ?? null,
    pretax_total: receipt.pretax_total ?? null,
    posttax_total: receipt.posttax_total ?? null,
    final_total: receipt.final_total ?? null,

    // Line items: readonly array → mutable, with field coercion
    line_items: [...receipt.line_items].map((item) => ({
      id: item.id,
      name: item.name ?? '', // undefined → empty string (Zod requires string)
      quantity: item.quantity,
      price_per_item: item.price_per_item,
      total_price: item.total_price,
      assignments: (item.assignments as string[]) ?? [], // json → string[] cast
    })),
  };
}
