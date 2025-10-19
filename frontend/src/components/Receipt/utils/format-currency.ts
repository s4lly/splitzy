/**
 * Truncate a numeric value to exactly two decimal places using string slicing.
 *
 * This avoids IEEE-754 floating-point rounding issues by operating on the
 * string representation of the number rather than performing floating-point
 * arithmetic.
 *
 * @param val - The input number to truncate.
 * @returns A string with exactly two decimal digits (e.g., "12.30").
 */
export function truncateToTwoDecimals(val: number): string {
  const str = val.toString();
  if (str.includes('.')) {
    const [intPart, decPart] = str.split('.');
    return intPart + '.' + (decPart + '00').slice(0, 2);
  } else {
    return str + '.00';
  }
}

/**
 * Truncate a floating-point number to N decimal places using numeric math.
 *
 * WARNING: Due to IEEE-754 floating-point precision, results can be
 * surprising when the scaled value is slightly below the expected integer.
 * For example, `truncateFloatByNDecimals(32.98, 2)` may produce `32.97`
 * because `32.98 * 100` can evaluate to `3297.9999999999995`, which
 * `Math.trunc` turns into `3297`.
 *
 * If you require truncation without floating-point surprises, prefer
 * `truncateToTwoDecimals` for 2-decimal currency formatting or use a
 * decimal/arbitrary-precision library.
 *
 * @param val - The input number to truncate.
 * @param n - The number of decimal places to keep (non-negative integer).
 * @returns The truncated number with up to N decimal places.
 */
export function truncateFloatByNDecimals(val: number, n: number): number {
  return Math.trunc(val * 10 ** n) / 10 ** n;
}

// TODO localize
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Format a numeric value as USD currency (e.g., "$12.34").
 *
 * This function first truncates the input to exactly two decimal places using
 * `truncateToTwoDecimals` to avoid floating-point rounding issues, then formats
 * the result using `Intl.NumberFormat` for proper currency display including:
 * - Currency symbol ($)
 * - Thousands separators (commas)
 * - Proper negative number formatting
 * - Exactly two decimal places
 *
 * Note: The locale is currently hardcoded to 'en-US' with USD currency.
 * Future enhancement: localize based on user preferences.
 *
 * @param val - The numeric value to format as currency.
 * @returns A formatted currency string (e.g., "$1,234.56" or "-$0.99").
 */
export function formatCurrency(val: number): string {
  return currencyFormatter.format(+truncateToTwoDecimals(val));
}
