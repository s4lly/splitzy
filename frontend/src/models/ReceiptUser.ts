import type { User } from './User';

/**
 * Represents a receipt user in the Splitzy application.
 *
 * ReceiptUsers are immutable and created from server state. They represent
 * individuals who can be assigned to line items for bill splitting purposes.
 * A ReceiptUser can optionally be linked to a User via userId, or exist
 * as an anonymous user with just a display name.
 *
 * @example
 * ```typescript
 * const receiptUser: ReceiptUser = {
 *   id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
 *   userId: 42,
 *   displayName: "Jane Doe",
 *   createdAt: new Date("2024-01-15"),
 *   deletedAt: null,
 *   user: {
 *     id: 42,
 *     authUserId: "user_2abc123",
 *     displayName: "Jane Doe",
 *     createdAt: new Date("2024-01-10"),
 *     deletedAt: null
 *   }
 * };
 * ```
 */
export interface ReceiptUser {
  /** The unique identifier for this receipt user (ULID) */
  readonly id: string;

  /** The ID of the linked User, or null if this is an anonymous receipt user */
  readonly userId: number | null;

  /** The display name, or null if not set */
  readonly displayName: string | null;

  /** The date and time when this receipt user was created */
  readonly createdAt: Date;

  /** The date and time when this receipt user was soft-deleted, or null if active */
  readonly deletedAt: Date | null;

  /** The linked User, if available and loaded, or null if not loaded or this is an anonymous receipt user */
  readonly user: User | null;
}
