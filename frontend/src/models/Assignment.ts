import type { ReceiptUser } from './ReceiptUser';

/**
 * Represents an assignment that links a receipt user to a receipt line item.
 * 
 * Assignments are immutable and created from server state. They track which
 * receipt user is responsible for which line item on a receipt.
 * 
 * @example
 * ```typescript
 * const assignment: Assignment = {
 *   id: 1,
 *   receiptUserId: 42,
 *   receiptLineItemId: "item-123",
 *   createdAt: new Date("2024-01-15"),
 *   deletedAt: null,
 *   receiptUser: {
 *     id: 42,
 *     userId: 1,
 *     displayName: "Jane Doe",
 *     createdAt: new Date("2024-01-10"),
 *     deletedAt: null
 *   }
 * };
 * ```
 */
export interface Assignment {
  /** The unique identifier for this assignment */
  readonly id: number;

  /** The ID of the receipt user assigned to this line item */
  readonly receiptUserId: number;

  /** The ID of the receipt line item this assignment refers to */
  readonly receiptLineItemId: string;

  /** The date and time when this assignment was created */
  readonly createdAt: Date;

  /** The date and time when this assignment was soft-deleted, or null if active */
  readonly deletedAt: Date | null;

  /** The receipt user associated with this assignment, or null if receipt user data is not loaded */
  readonly receiptUser: ReceiptUser | null;
}
