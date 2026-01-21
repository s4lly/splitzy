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
 *   deletedAt: null
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
}
