import type { Receipt } from '@/models/Receipt';
import Decimal from 'decimal.js';

/**
 * Props for the BillSplitSection component.
 * Manages the bill splitting UI including people management, assignment progress, and breakdown.
 */
export interface BillSplitSectionProps {
  /** List of people participating in the bill split */
  people: string[];
  /** Unique identifier for the receipt */
  receiptId: string;
  /** Complete receipt including metadata and line items */
  receipt: Receipt;
  /** Map of person names to their final fair-rounded totals */
  personFairTotals: Map<string, Decimal>;
  /** Map of person names to their pre-tax item totals */
  personPretaxTotals: Map<string, Decimal>;
  /** Sum of all person totals before fair rounding */
  personTotalsSum: Decimal;
  /** Total receipt amount including tax, tip, and all items */
  receiptTotal: Decimal;
  /** Amount not yet assigned to any person */
  unassignedAmount: Decimal;
  /** Whether all items have been assigned to at least one person */
  isFullyAssigned: boolean;
  /** Whether to use equal split mode (no assignments or no line items) */
  useEqualSplit: boolean;
  /** Whether the receipt contains detailed line items */
  receiptHasLineItems: boolean;
  /** Callback to add a new person to the split */
  onAddPerson: (name: string) => void;
  /** Callback to remove a person from the split */
  onRemovePerson: (name: string) => void;
}
