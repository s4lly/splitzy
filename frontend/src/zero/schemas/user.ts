/**
 * User schema for Zero.
 *
 * Represents a user in the Splitzy application. Users are the core entity
 * that owns receipts and can be assigned to line items for bill splitting.
 *
 * Database table: users
 * - Stores user authentication details and profile information.
 * - Links to Clerk auth system via auth_user_id.
 * - Supports soft deletion via deleted_at timestamp.
 *
 * Relationships:
 * - One-to-many with user_receipts (users.id -> user_receipts.user_id)
 * - One-to-many with assignments (users.id -> assignments.user_id)
 */

import { number, string, table } from '@rocicorp/zero';

export const user = table('users')
  .columns({
    id: number(),
    auth_user_id: string(),
    display_name: string().optional(),
    created_at: number(),
    deleted_at: number().optional(),
  })
  .primaryKey('id');
