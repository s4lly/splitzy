/**
 * Receipt user schema for Zero.
 *
 * Represents a user that can be assigned to receipt line items for bill splitting.
 * ReceiptUsers can optionally link to a User via user_id, or exist as anonymous
 * users with just a display_name.
 *
 * Database table: receipt_users
 * - Stores receipt user details and optional link to users table.
 * - Supports soft deletion via deleted_at timestamp.
 *
 * Relationships:
 * - Many-to-one with users (receipt_users.user_id -> users.id, optional)
 * - One-to-many with assignments (receipt_users.id -> assignments.receipt_user_id)
 */

import { number, string, table } from "@rocicorp/zero";

export const receiptUser = table("receipt_users")
  .columns({
    id: string(), // ULID, client-generated
    user_id: number().optional(),
    display_name: string().optional(),
    created_at: number(),
    deleted_at: number().optional(),
  })
  .primaryKey("id");
