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
import type { Assignment } from '@/models/Assignment';
import { fromZeroReceipt } from '@/models/transformers/fromZero';
import Decimal from 'decimal.js';
import { atom } from 'jotai';

// =============================================================================
// Base Atom (synced from ReceiptContext)
// =============================================================================

/**
 * Base atom that holds the receipt data from Zero (raw).
 * This is synced from ReceiptContext via useReceiptSync hook.
 */
export const receiptRawAtom = atom<ReceiptWithLineItems | null>(null);

/**
 * Base atom that holds the canonical Receipt model.
 * Transformed from Zero data using fromZeroReceipt.
 */
export const receiptAtom = atom((get) => {
  const rawReceipt = get(receiptRawAtom);
  return rawReceipt ? fromZeroReceipt(rawReceipt) : null;
});

/**
 * Receipt ID as a string (for compatibility with existing components)
 */
export const receiptIdAtom = atom((get) => {
  const receipt = get(receiptAtom);
  return receipt ? String(receipt.id) : null;
});

// =============================================================================
// Read-Only Derived Atoms
// =============================================================================

/**
 * Derives line items from the receipt for convenience
 */
export const lineItemsAtom = atom((get) => {
  const receipt = get(receiptAtom);
  return receipt?.lineItems ?? [];
});

/**
 * Creates the ItemSplits structure from line item assignments.
 * This organizes which people are assigned to which items.
 */
export const itemSplitsAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return null;

  return calculations.pretax.createItemSplitsFromAssignments(receipt.lineItems);
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

  return calculations.pretax.getTotalForAllItems(receipt);
});

/**
 * Total receipt amount including all items, tax, tip, and gratuity
 */
export const receiptTotalAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return new Decimal(0);

  return calculations.final.getReceiptTotal(receipt);
});

/**
 * Whether the receipt has line items
 */
export const hasLineItemsAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return false;

  return hasLineItems(receipt);
});

/**
 * Whether equal split mode should be used
 */
export const useEqualSplitAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return true;

  return shouldUseEqualSplit(receipt);
});

/**
 * Whether all items are fully assigned
 */
export const isFullyAssignedAtom = atom((get) => {
  const receipt = get(receiptAtom);
  if (!receipt) return false;

  return areAllItemsAssigned(receipt);
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

    return calculations.final.getPersonTotals(receipt, { itemSplits });
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
// Assignments Management Atoms
// =============================================================================

/**
 * Base atom for the list of all assignments (including unassigned)
 */
const assignmentsOverrideAtom = atom<Assignment[] | null>(null);

/**
 * List of all unique assignments involved in the receipt split.
 * Defaults to extracting unique assignments by userId from line item assignments.
 */
export const assignmentsAtom = atom(
  (get) => {
    const override = get(assignmentsOverrideAtom);
    if (override) return override;

    const receipt = get(receiptAtom);
    if (!receipt) return [];

    // Extract unique assignments by userId from line item assignments
    const assignments = new Map<number, Assignment>();
    for (const item of receipt.lineItems) {
      for (const assignment of item.assignments) {
        if (!assignments.has(assignment.userId)) {
          assignments.set(assignment.userId, assignment);
        }
      }
    }
    return Array.from(assignments.values());
  },
  (_get, set, newValue: Assignment[] | null) => {
    set(assignmentsOverrideAtom, newValue);
  }
);
