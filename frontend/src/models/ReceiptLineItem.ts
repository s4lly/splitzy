import Decimal from 'decimal.js';
import type { Assignment } from './Assignment';

/**
 * Represents a single line item on a receipt.
 *
 * Line items are immutable and created from server state. They represent
 * individual products or services listed on a receipt, with pricing information
 * and user assignments. Use mutation functions to update line items rather than
 * modifying them directly.
 *
 * @example
 * ```typescript
 * const lineItem: ReceiptLineItem = {
 *   id: "item-123",
 *   name: "Coffee",
 *   quantity: new Decimal(2),
 *   pricePerItem: new Decimal(4.50),
 *   totalPrice: new Decimal(9.00),
 *   deletedAt: null,
 *   assignments: []
 * };
 * ```
 */
export interface ReceiptLineItem {
  /** The unique identifier for this line item */
  readonly id: string;

  /** The name or description of the item */
  readonly name: string | null;

  /** The quantity of this item, using Decimal.js for precision */
  readonly quantity: Decimal;

  /** The price per individual item, using Decimal.js for precision */
  readonly pricePerItem: Decimal;

  /** The total price for this line item (quantity × pricePerItem), using Decimal.js for precision */
  readonly totalPrice: Decimal;

  /** The date and time when this line item was soft-deleted, or null if active */
  readonly deletedAt: Date | null;

  /** Array of assignments linking users to this line item */
  readonly assignments: readonly Assignment[];
}
