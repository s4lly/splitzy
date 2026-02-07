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
  // Split on one or more whitespace: \s = any whitespace (space, tab, newline, etc.),
  // + = one or more, so multiple spaces between names don't create empty entries.
  const parts = name.trim().split(/\s+/);

  // No parts after split (e.g. empty or whitespace-only string) or first part is empty.
  if (parts.length === 0 || !parts[0]) {
    return '';
  }

  // Destructure: first element is the first name; we only need it for the first initial.
  const [firstPart] = parts;
  const firstInitial = firstPart.charAt(0).toUpperCase();

  // When there is only one part (single name), we have no last initial.
  let lastInitial = '';
  if (parts.length > 1) {
    // at(-1) gets the last element (negative index from end); avoids parts[parts.length - 1].
    const lastPart = parts.at(-1);
    if (lastPart) {
      lastInitial = lastPart.charAt(0).toUpperCase();
    }
  }

  return firstInitial + lastInitial;
}
