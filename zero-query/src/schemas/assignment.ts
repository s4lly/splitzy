/**
 * Assignment schema for Zero.
 *
 * Represents a link between a user and a receipt line item for bill splitting.
 * Assignments track which user is responsible for which line item on a receipt.
 *
 * Database table: assignments
 * - Junction table linking users to receipt_line_items.
 * - Supports soft deletion via deleted_at timestamp.
 * - Foreign keys: user_id -> users.id, receipt_line_item_id -> receipt_line_items.id (UUID).
 *
 * Relationships:
 * - Many-to-one with users (assignments.user_id -> users.id)
 * - Many-to-one with receipt_line_items (assignments.receipt_line_item_id -> receipt_line_items.id)
 */

import { number, string, table } from "@rocicorp/zero";

export const assignment = table("assignments")
  .columns({
    id: number(),
    user_id: number().optional(),
    display_name: string().optional(),
    receipt_line_item_id: string(), // FK to receipt_line_items.id (UUID)
    created_at: number(),
    deleted_at: number().optional(),
  })
  .primaryKey("id");
