import Decimal from 'decimal.js';

/**
 * Truncate a numeric value to exactly two decimal places using string slicing.
 *
 * This avoids IEEE-754 floating-point rounding issues by operating on the
 * string representation of the number rather than performing floating-point
 * arithmetic.
 *
 * @param val - The input Decimal or number to truncate.
 * @returns A string with exactly two decimal digits (e.g., "12.30").
 */
export function truncateToTwoDecimals(val: Decimal): string;
export function truncateToTwoDecimals(val: number): string;
export function truncateToTwoDecimals(val: Decimal | number): string {
  const decimal = val instanceof Decimal ? val : new Decimal(val);

  const str = decimal.toString();
  if (str.includes('.')) {
    const [intPart, decPart] = str.split('.');
    return intPart + '.' + (decPart + '00').slice(0, 2);
  } else {
    return str + '.00';
  }
}

// TODO localize
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Format a numeric value as USD currency (e.g., "$12.34").
 *
 * Formats the input using `Intl.NumberFormat` for proper currency display including:
 * - Currency symbol ($)
 * - Thousands separators (commas)
 * - Proper negative number formatting
 * - Exactly two decimal places
 *
 * Note: The locale is currently hardcoded to 'en-US' with USD currency.
 * Future enhancement: localize based on user preferences.
 *
 * @param val - The numeric value to format as currency. Can be a number or Decimal.
 * @returns A formatted currency string (e.g., "$1,234.56" or "-$0.99").
 *
 * @example
 * ```ts
 * formatCurrency(1234.56)  // "$1,234.56"
 * formatCurrency(new Decimal('1234.56'))  // "$1,234.56"
 * formatCurrency(-0.99)  // "-$0.99"
 * formatCurrency(1000000)  // "$1,000,000.00"
 * ```
 */
export function formatCurrency(val: Decimal): string;
export function formatCurrency(val: number): string;
export function formatCurrency(val: Decimal | number): string {
  const num = val instanceof Decimal ? val.toNumber() : val;
  return currencyFormatter.format(num);
}
