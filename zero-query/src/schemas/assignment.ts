/**
 * Assignment schema for Zero.
 *
 * Represents a link between a receipt user and a receipt line item for bill splitting.
 * Assignments track which receipt user is responsible for which line item on a receipt.
 *
 * Database table: assignments
 * - Junction table linking receipt_users to receipt_line_items.
 * - Supports soft deletion via deleted_at timestamp.
 * - Foreign keys: receipt_user_id -> receipt_users.id, receipt_line_item_id -> receipt_line_items.id (UUID).
 *
 * Relationships:
 * - Many-to-one with receipt_users (assignments.receipt_user_id -> receipt_users.id)
 * - Many-to-one with receipt_line_items (assignments.receipt_line_item_id -> receipt_line_items.id)
 */

import { number, string, table } from "@rocicorp/zero";

export const assignment = table("assignments")
  .columns({
    id: string(), // ULID, client-generated
    receipt_user_id: string(), // FK to receipt_users.id (ULID)
    receipt_line_item_id: string(), // FK to receipt_line_items.id (UUID)
    created_at: number(),
    deleted_at: number().optional(),
  })
  .primaryKey("id");
