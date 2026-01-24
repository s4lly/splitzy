import type {
  AssignmentWithUser,
  ReceiptWithLineItems,
} from '@/context/ReceiptContext';
import type { Assignment } from '@/models/Assignment';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import Decimal from 'decimal.js';

/**
 * Transforms a Rocicorp Zero query result to the canonical Receipt interface.
 * Converts all numeric values to Decimal.js for precision and handles date conversions.
 * Zero stores dates as Unix timestamps (numbers), which are converted to Date objects.
 */
export function fromZeroReceipt(zeroReceipt: ReceiptWithLineItems): Receipt {
  console.log("=".repeat(100), "fromZeroReceipt", zeroReceipt);
  // Convert Unix timestamps to Date objects
  const createdAt = new Date(zeroReceipt.created_at);
  const date = zeroReceipt.date ? new Date(zeroReceipt.date) : null;

  // Convert numeric fields to Decimal (null/undefined becomes null)
  const toDecimal = (value: number | null | undefined): Decimal | null =>
    value != null ? new Decimal(value) : null;

  // Transform line items
  const lineItems: readonly ReceiptLineItem[] = zeroReceipt.line_items.map(
    (item): ReceiptLineItem => ({
      id: item.id,
      name: item.name ?? '',
      quantity: new Decimal(item.quantity),
      pricePerItem: new Decimal(item.price_per_item),
      totalPrice: new Decimal(item.total_price),
      deletedAt: item.deleted_at ? new Date(item.deleted_at) : null,
      assignments: (item.assignments ?? []).map(
        (a: AssignmentWithUser): Assignment => ({
          id: a.id,
          userId: a.user_id ?? null,
          displayName: a.display_name ?? null,
          receiptLineItemId: a.receipt_line_item_id,
          createdAt: new Date(a.created_at),
          deletedAt: a.deleted_at ? new Date(a.deleted_at) : null,
          user: a.user ? {
            id: a.user.id,
            authUserId: a.user.auth_user_id,
            displayName: a.user.display_name ?? null,
            createdAt: new Date(a.user.created_at),
            deletedAt: a.user.deleted_at ? new Date(a.user.deleted_at) : null,
          } : null,
        })
      ),
    })
  );

  return {
    // Identifiers
    id: zeroReceipt.id,
    createdAt,
    imagePath: zeroReceipt.image_path ?? null,
    imageVisibility: (zeroReceipt.image_visibility ?? 'public') as
      | 'public'
      | 'owner_only',
    authUserId: zeroReceipt.user?.auth_user_id ?? null,

    // Core receipt data
    merchant: zeroReceipt.merchant ?? null,
    date,
    paymentMethod: zeroReceipt.payment_method ?? null,

    // Amounts (all as Decimal for precision)
    subtotal: toDecimal(zeroReceipt.subtotal),
    displaySubtotal: toDecimal(zeroReceipt.display_subtotal),
    tax: toDecimal(zeroReceipt.tax),
    tip: toDecimal(zeroReceipt.tip),
    gratuity: toDecimal(zeroReceipt.gratuity),
    total: toDecimal(zeroReceipt.total),
    itemsTotal: toDecimal(zeroReceipt.items_total),
    pretaxTotal: toDecimal(zeroReceipt.pretax_total),
    posttaxTotal: toDecimal(zeroReceipt.posttax_total),
    finalTotal: toDecimal(zeroReceipt.final_total),

    // Flags
    isReceipt: zeroReceipt.is_receipt ?? true,
    taxIncludedInItems: zeroReceipt.tax_included_in_items ?? false,

    // Line items
    lineItems,
  };
}
