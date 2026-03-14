import Decimal from 'decimal.js';

import { i18n } from '@/i18n';

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

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Format a numeric value as currency using the app's active locale.
 *
 * Formats the input using `Intl.NumberFormat` for proper currency display including:
 * - Locale-appropriate currency symbol
 * - Locale-appropriate thousands/decimal separators
 * - Proper negative number formatting
 * - Exactly two decimal places
 *
 * @param val - The numeric value to format as currency. Can be a number or Decimal.
 * @param currency - ISO 4217 currency code (defaults to 'USD').
 * @returns A formatted currency string (e.g., "$1,234.56" or "-$0.99").
 */
export function formatCurrency(val: Decimal, currency?: string): string;
export function formatCurrency(val: number, currency?: string): string;
export function formatCurrency(
  val: Decimal | number,
  currency: string = 'USD'
): string {
  const num = val instanceof Decimal ? val.toNumber() : val;
  const locale = i18n.locale || 'en-US';
  return getFormatter(locale, currency).format(num);
}
