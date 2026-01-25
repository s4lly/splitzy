import type { Assignment } from '@/models/Assignment';

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
  // Priority 1: Use the user-defined display name if available
  // This comes from the linked User's displayName field
  if (assignment.receiptUser?.user?.displayName) {
    return assignment.receiptUser.user.displayName;
  }

  // Priority 2: Use the receipt owner-created display name if available
  // This comes from the ReceiptUser's displayName field (for anonymous users)
  if (assignment.receiptUser?.displayName) {
    return assignment.receiptUser.displayName;
  }

  // Priority 3: Fallback to receipt user ID
  // receiptUserId should always exist - if it doesn't, there's a major error
  if (assignment.receiptUserId !== undefined && assignment.receiptUserId !== null) {
    return `User ${assignment.receiptUserId}`;
  }

  // This should never happen - receiptUserId is required
  // If we reach here, there's a data integrity issue
  return 'User Unknown';
}
