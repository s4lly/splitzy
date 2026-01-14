import Decimal from 'decimal.js';

/**
 * Immutable line item - created from server state, never directly modified.
 * Use mutation functions to update.
 */
export interface ReceiptLineItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: Decimal;
  readonly pricePerItem: Decimal;
  readonly totalPrice: Decimal;
  readonly assignments: readonly string[];
}

/**
 * Immutable receipt - created from server state, never directly modified.
 * Use mutation functions to update.
 */
export interface Receipt {
  // Identifiers
  readonly id: number;
  readonly createdAt: Date;
  readonly imagePath: string | null;
  readonly imageVisibility: 'public' | 'owner_only';
  readonly authUserId: string | null;

  // Core receipt data
  readonly merchant: string | null;
  readonly date: Date | null;
  readonly paymentMethod: string | null;

  // Amounts (all as Decimal for precision)
  readonly subtotal: Decimal | null;
  readonly displaySubtotal: Decimal | null;
  readonly tax: Decimal | null;
  readonly tip: Decimal | null;
  readonly gratuity: Decimal | null;
  readonly total: Decimal | null;
  readonly itemsTotal: Decimal | null;
  readonly pretaxTotal: Decimal | null;
  readonly posttaxTotal: Decimal | null;
  readonly finalTotal: Decimal | null;

  // Flags
  readonly isReceipt: boolean;
  readonly taxIncludedInItems: boolean;

  // Line items
  readonly lineItems: readonly ReceiptLineItem[];
}
