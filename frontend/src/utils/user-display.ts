import type { Assignment } from '@/models/Assignment';
import type { ReceiptUser } from '@/models/ReceiptUser';

/**
 * Gets the display name for a receipt user from a ReceiptUser object.
 *
 * Display name precedence (in order of preference):
 * 1. User-defined display name (from the linked User's displayName)
 * 2. Receipt owner-created display name (from ReceiptUser's displayName)
 * 3. Receipt user ID (fallback - receiptUserId should always exist)
 *
 * @param receiptUser - The receipt user object
 * @param receiptUserId - The receipt user ID as fallback
 * @returns A display string for the receipt user
 */
export function getReceiptUserDisplayName(
  receiptUser: ReceiptUser | null | undefined,
  receiptUserId: string
): string {
  // Priority 1: Use the user-defined display name if available
  // This comes from the linked User's displayName field
  if (receiptUser?.user?.displayName) {
    return receiptUser.user.displayName;
  }

  // Priority 2: Use the receipt owner-created display name if available
  // This comes from the ReceiptUser's displayName field (for anonymous users)
  if (receiptUser?.displayName) {
    return receiptUser.displayName;
  }

  // Priority 3: Fallback to receipt user ID
  return `User ${receiptUserId}`;
}

/**
 * Gets the display name for a receipt user from an assignment.
 *
 * Display name precedence (in order of preference):
 * 1. User-defined display name (from the linked User's displayName)
 * 2. Receipt owner-created display name (from ReceiptUser's displayName)
 * 3. Receipt user ID (fallback - receiptUserId should always exist)
 *
 * @param assignment - The assignment containing receipt user information
 * @returns A display string for the receipt user
 */
export function getUserDisplayName(assignment: Assignment): string {
  return getReceiptUserDisplayName(
    assignment.receiptUser,
    assignment.receiptUserId
  );
}
