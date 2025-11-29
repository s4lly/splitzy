import { describe, expect, it } from 'vitest';
import { formatCurrency, truncateToTwoDecimals } from './format-currency';

describe('truncateToTwoDecimals', () => {
  it('truncates to two decimals without rounding', () => {
    expect(truncateToTwoDecimals(12.345)).toBe('12.34');
    expect(truncateToTwoDecimals(12.349)).toBe('12.34');
    expect(truncateToTwoDecimals(0.999)).toBe('0.99');
    expect(truncateToTwoDecimals(1)).toBe('1.00');
    expect(truncateToTwoDecimals(0)).toBe('0.00');
    expect(truncateToTwoDecimals(-1.567)).toBe('-1.56');
    expect(truncateToTwoDecimals(1000000.1234)).toBe('1000000.12');
  });

  it('handles string input by coercion', () => {
    // @ts-expect-error
    expect(truncateToTwoDecimals('12.345')).toBe('12.34');
  });

  it('avoids floating-point precision issues by using string manipulation', () => {
    // This function uses string-based truncation to avoid floating-point issues
    expect(truncateToTwoDecimals(32.98)).toBe('32.98'); // Correctly returns 32.98!

    // Other floating-point problematic cases also work correctly
    expect(truncateToTwoDecimals(0.1 + 0.2)).toBe('0.30'); // 0.30000000000000004 -> '0.30'
    expect(truncateToTwoDecimals(1.005)).toBe('1.00'); // Consistently truncates to 1.00
  });

  it('always returns exactly two decimal places', () => {
    expect(truncateToTwoDecimals(5)).toBe('5.00');
    expect(truncateToTwoDecimals(5.1)).toBe('5.10');
    expect(truncateToTwoDecimals(5.12)).toBe('5.12');
    expect(truncateToTwoDecimals(5.123)).toBe('5.12');
    expect(truncateToTwoDecimals(0)).toBe('0.00');
  });
});

describe('formatCurrency', () => {
  it('formats positive numbers as $X.XX with proper currency symbol', () => {
    expect(formatCurrency(12.34)).toBe('$12.34');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(5.99)).toBe('$5.99');
  });

  it('formats negative numbers with proper Intl.NumberFormat styling', () => {
    expect(formatCurrency(-12.34)).toBe('-$12.34');
    expect(formatCurrency(-0.01)).toBe('-$0.01');
    expect(formatCurrency(-999.99)).toBe('-$999.99');
  });

  it('formats numbers with more than two decimals (rounds via Intl.NumberFormat)', () => {
    // Note: formatCurrency uses Intl.NumberFormat which rounds, not truncates
    // TODO investigate if this is what we want. before it was truncating to two decimals.
    expect(formatCurrency(12.349)).toBe('$12.35'); // Rounds to nearest cent
    expect(formatCurrency(0.999)).toBe('$1.00'); // Rounds up
    expect(formatCurrency(12.999)).toBe('$13.00'); // Rounds up
    expect(formatCurrency(99.9999)).toBe('$100.00'); // Rounds up
  });

  it('handles large numbers with thousands separators via Intl.NumberFormat', () => {
    expect(formatCurrency(1234567.89123)).toBe('$1,234,567.89');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    expect(formatCurrency(999999.99999)).toBe('$1,000,000.00'); // Rounds up
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles very small positive numbers', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
    expect(formatCurrency(0.001)).toBe('$0.00'); // truncates to 0.00
    expect(formatCurrency(0.0001)).toBe('$0.00');
  });

  it('handles floating-point edge cases', () => {
    expect(formatCurrency(32.98)).toBe('$32.98');
    expect(formatCurrency(0.1 + 0.2)).toBe('$0.30'); // 0.30000000000000004 -> $0.30
    expect(formatCurrency(10.555)).toBe('$10.56'); // rounds to nearest cent
  });

  it('handles edge cases with Intl.NumberFormat', () => {
    // NaN formatted by Intl.NumberFormat includes currency symbol
    expect(formatCurrency(NaN)).toBe('$NaN');

    // Infinity formatted by Intl.NumberFormat
    expect(formatCurrency(Infinity)).toBe('$∞');
    expect(formatCurrency(-Infinity)).toBe('-$∞');
  });

  it('formats numbers correctly', () => {
    expect(formatCurrency(32.98)).toBe('$32.98');
    expect(formatCurrency(1.005)).toBe('$1.01'); // rounds to nearest cent
  });
});

// truncateFloatByNDecimals was removed - tests removed
