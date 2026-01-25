/**
 * User receipt schema for Zero.
 *
 * Represents a receipt (or document) owned by a user. Stores denormalized
 * receipt data, including regular receipts and transportation tickets.
 *
 * Database table: user_receipts
 * - Denormalized fields from backend user_receipt model (merchant, totals, etc.).
 * - image_visibility: 'public' | 'owner_only'.
 * - Optional user_id links to users; supports receipt_metadata JSONB.
 *
 * Relationships:
 * - Many-to-one with users (user_receipts.user_id -> users.id)
 * - One-to-many with receipt_line_items (user_receipts.id -> receipt_line_items.receipt_id)
 */

import {
  boolean,
  json,
  number,
  string,
  table,
} from '@rocicorp/zero';

export const userReceipt = table('user_receipts')
  .columns({
    id: number(),
    user_id: number().optional(),
    image_path: string().optional(),
    image_visibility: string().optional(), // 'public' | 'owner_only'
    created_at: number(),
    is_receipt: boolean().optional(),
    document_type: string().optional(),
    merchant: string().optional(),
    date: number().optional(),
    subtotal: number().optional(),
    tax: number().optional(),
    tip: number().optional(),
    gratuity: number().optional(),
    total: number().optional(),
    payment_method: string().optional(),
    tax_included_in_items: boolean().optional(),
    display_subtotal: number().optional(),
    items_total: number().optional(),
    pretax_total: number().optional(),
    posttax_total: number().optional(),
    final_total: number().optional(),
    carrier: string().optional(),
    ticket_number: string().optional(),
    origin: string().optional(),
    destination: string().optional(),
    passenger: string().optional(),
    class_: string().from('class').optional(),
    fare: number().optional(),
    currency: string().optional(),
    taxes: number().optional(),
    receipt_metadata: json().optional(),
  })
  .primaryKey('id');
