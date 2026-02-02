import Decimal from 'decimal.js';
import type { ReceiptLineItem } from './ReceiptLineItem';

/**
 * Represents a receipt with all its associated data.
 *
 * Receipts are immutable and created from server state. They contain
 * comprehensive information about a transaction including merchant details,
 * pricing breakdowns, payment information, and line items. All monetary
 * values use Decimal.js for precision to avoid floating-point errors.
 * Use mutation functions to update receipts rather than modifying them directly.
 *
 * @example
 * ```typescript
 * const receipt: Receipt = {
 *   id: 1,
 *   createdAt: new Date("2024-01-15"),
 *   imagePath: "/images/receipt-1.jpg",
 *   imageVisibility: "public",
 *   authUserId: "user-123",
 *   merchant: "Coffee Shop",
 *   date: new Date("2024-01-15"),
 *   paymentMethod: "Credit Card",
 *   subtotal: new Decimal(50.00),
 *   displaySubtotal: new Decimal(50.00),
 *   tax: new Decimal(4.50),
 *   tip: new Decimal(5.00),
 *   gratuity: null,
 *   total: new Decimal(59.50),
 *   itemsTotal: new Decimal(50.00),
 *   pretaxTotal: new Decimal(50.00),
 *   posttaxTotal: new Decimal(54.50),
 *   finalTotal: new Decimal(59.50),
 *   isReceipt: true,
 *   taxIncludedInItems: false,
 *   lineItems: []
 * };
 * ```
 */
export interface Receipt {
  // Identifiers
  /** The unique identifier for this receipt */
  readonly id: number;

  /** The date and time when this receipt was created in the system */
  readonly createdAt: Date;

  /** The file path to the receipt image, or null if no image is available */
  readonly imagePath: string | null;

  /** The visibility setting for the receipt image: 'public' or 'owner_only' */
  readonly imageVisibility: 'public' | 'owner_only';

  /** The authentication user ID associated with this receipt, or null if not linked */
  readonly authUserId: string | null;

  // Core receipt data
  /** The name of the merchant or business where the receipt is from */
  readonly merchant: string | null;

  /** The date of the transaction, or null if not specified */
  readonly date: Date | null;

  /** The payment method used (e.g., "Credit Card", "Cash"), or null if not specified */
  readonly paymentMethod: string | null;

  // Amounts (all as Decimal for precision)
  /** The subtotal amount before taxes and fees, using Decimal.js for precision */
  readonly subtotal: Decimal | null;

  /** The display subtotal (may differ from subtotal for display purposes), using Decimal.js for precision */
  readonly displaySubtotal: Decimal | null;

  /** The tax amount, using Decimal.js for precision */
  readonly tax: Decimal | null;

  /** The tip amount, using Decimal.js for precision */
  readonly tip: Decimal | null;

  /** The gratuity amount, using Decimal.js for precision */
  readonly gratuity: Decimal | null;

  /** The total amount, using Decimal.js for precision */
  readonly total: Decimal | null;

  /** The sum of all line item totals, using Decimal.js for precision */
  readonly itemsTotal: Decimal | null;

  /** The total before taxes, using Decimal.js for precision */
  readonly pretaxTotal: Decimal | null;

  /** The total after taxes but before tips/gratuity, using Decimal.js for precision */
  readonly posttaxTotal: Decimal | null;

  /** The final total including all charges, using Decimal.js for precision */
  readonly finalTotal: Decimal | null;

  // Flags
  /** Whether this record is confirmed to be a receipt (vs. a draft or other document type) */
  readonly isReceipt: boolean;

  /** Whether tax is already included in the individual line item prices */
  readonly taxIncludedInItems: boolean;

  // Line items
  /** Array of line items that make up this receipt */
  readonly lineItems: readonly ReceiptLineItem[];
}
