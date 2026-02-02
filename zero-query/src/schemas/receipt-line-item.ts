/**
 * Receipt line item schema for Zero.
 *
 * Represents a single line item on a receipt (e.g. a product or service).
 * Line items store pricing, quantity, and link to user assignments for splitting.
 *
 * Database table: receipt_line_items
 * - Uses UUID as primary key (stored as string in Zero).
 * - Foreign key receipt_id -> user_receipts.id.
 * - Stores name, quantity, price_per_item, total_price, and created_at.
 *
 * Relationships:
 * - Many-to-one with user_receipts (receipt_line_items.receipt_id -> user_receipts.id)
 * - One-to-many with assignments (receipt_line_items.id -> assignments.receipt_line_item_id)
 */

import { number, string, table } from '@rocicorp/zero';

export const receiptLineItem = table('receipt_line_items')
  .columns({
    id: string(), // UUID maps to string in Zero
    receipt_id: number(), // Foreign key to user_receipts.id
    name: string().optional(),
    quantity: number(),
    price_per_item: number(),
    total_price: number(),
    created_at: number(),
    deleted_at: number().optional(),
  })
  .primaryKey('id');
