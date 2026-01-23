/**
 * Represents a user in the Splitzy application.
 *
 * Users are immutable and created from server state. They represent
 * individuals who can own receipts and be assigned to line items for
 * bill splitting purposes.
 *
 * @example
 * ```typescript
 * const user: User = {
 *   id: 1,
 *   authUserId: "user_2abc123",
 *   username: "jane",
 *   displayName: "Jane Doe",
 *   email: "jane@example.com",
 *   createdAt: new Date("2024-01-15"),
 *   deletedAt: null
 * };
 * ```
 */
export interface User {
  /** The unique identifier for this user */
  readonly id: number;

  /** The Clerk authentication user ID */
  readonly authUserId: string;

  /** The username, or null if not set */
  readonly username: string | null;

  /** The display name, or null if not set */
  readonly displayName: string | null;

  /** The email address, or null if not set */
  readonly email: string | null;

  /** The date and time when this user was created */
  readonly createdAt: Date;

  /** The date and time when this user was soft-deleted, or null if active */
  readonly deletedAt: Date | null;
}
