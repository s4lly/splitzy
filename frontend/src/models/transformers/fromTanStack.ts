import Decimal from 'decimal.js';
import { z } from 'zod';
import { ReceiptResponseSchema } from '@/lib/receiptSchemas';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

/**
 * Transforms a TanStack Query response to the canonical Receipt interface.
 * Converts all numeric values to Decimal.js for precision and handles date conversions.
 */
export function fromTanStackResponse(
  response: z.infer<typeof ReceiptResponseSchema>
): Receipt {
  const { receipt } = response;
  const { receipt_data } = receipt;

  // Parse date strings to Date objects
  const createdAt = new Date(receipt.created_at);
  const date = receipt_data.date ? new Date(receipt_data.date) : null;

  // Convert numeric fields to Decimal (null stays null)
  const toDecimal = (value: number | null): Decimal | null =>
    value !== null ? new Decimal(value) : null;

  // Transform line items
  const lineItems: readonly ReceiptLineItem[] = receipt_data.line_items.map(
    (item): ReceiptLineItem => ({
      id: item.id,
      name: item.name,
      quantity: new Decimal(item.quantity),
      pricePerItem: new Decimal(item.price_per_item),
      totalPrice: new Decimal(item.total_price),
      assignments: [], // Assignments are only available via Zero queries
    })
  );

  return {
    // Identifiers
    id: receipt.id,
    createdAt,
    imagePath: receipt.image_path ?? null,
    imageVisibility: (receipt.image_visibility ?? 'public') as
      | 'public'
      | 'owner_only',
    authUserId: null, // Backend API doesn't provide user info

    // Core receipt data
    merchant: receipt_data.merchant,
    date,
    paymentMethod: receipt_data.payment_method,

    // Amounts (all as Decimal for precision)
    subtotal: toDecimal(receipt_data.subtotal),
    displaySubtotal: toDecimal(receipt_data.display_subtotal),
    tax: toDecimal(receipt_data.tax),
    tip: toDecimal(receipt_data.tip),
    gratuity: toDecimal(receipt_data.gratuity),
    total: toDecimal(receipt_data.total),
    itemsTotal: toDecimal(receipt_data.items_total),
    pretaxTotal: toDecimal(receipt_data.pretax_total),
    posttaxTotal: toDecimal(receipt_data.posttax_total),
    finalTotal: toDecimal(receipt_data.final_total),

    // Flags
    isReceipt: receipt_data.is_receipt,
    taxIncludedInItems: receipt_data.tax_included_in_items,

    // Line items
    lineItems,
  };
}

