import type { Assignment } from '@/models/Assignment';

/**
 * Gets the display name for a user from an assignment.
 * Falls back to assignment.displayName (for anonymous assignments), then "User {userId}" if displayName is not available.
 *
 * @param assignment - The assignment containing user information
 * @returns A display string for the user
 */
export function getUserDisplayName(assignment: Assignment): string {
  return (
    assignment.user?.displayName ??
    assignment.displayName ??
    `User ${assignment.userId ?? 'Unknown'}`
  );
}
