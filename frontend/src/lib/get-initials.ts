/**
 * Extracts initials from a name (first letter of first name + first letter of last name).
 * Returns uppercase initials.
 *
 * Examples:
 * - "John Doe" -> "JD"
 * - "Alice" -> "A"
 * - "Mary Jane Watson" -> "MW" (first + last)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '';

  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial =
    parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : '';

  return firstInitial + lastInitial;
}
