import type { User } from './User';

/**
 * Represents an assignment that links a user to a receipt line item.
 * 
 * Assignments are immutable and created from server state. They track which
 * user is responsible for which line item on a receipt.
 * 
 * @example
 * ```typescript
 * const assignment: Assignment = {
 *   id: 1,
 *   userId: 42,
 *   receiptLineItemId: "item-123",
 *   createdAt: new Date("2024-01-15"),
 *   deletedAt: null,
 *   user: {
 *     id: 42,
 *     authUserId: "user_2abc123",
 *     username: "jane",
 *     displayName: "Jane Doe",
 *     email: "jane@example.com",
 *     createdAt: new Date("2024-01-10"),
 *     deletedAt: null
 *   }
 * };
 * ```
 */
export interface Assignment {
  /** The unique identifier for this assignment */
  readonly id: number;

  /** The ID of the user assigned to this line item */
  readonly userId: number;

  /** The ID of the receipt line item this assignment refers to */
  readonly receiptLineItemId: string;

  /** The date and time when this assignment was created */
  readonly createdAt: Date;

  /** The date and time when this assignment was soft-deleted, or null if active */
  readonly deletedAt: Date | null;

  /** The user associated with this assignment, or null if user data is not loaded */
  readonly user: User | null;
}
