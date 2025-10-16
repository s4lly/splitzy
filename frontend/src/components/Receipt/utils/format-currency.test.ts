import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  truncateFloatByNDecimals,
  truncateToTwoDecimals,
} from './format-currency';

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
    // This is the key advantage over truncateFloatByNDecimals
    // The problematic case from truncateFloatByNDecimals JSDoc works correctly here
    expect(truncateToTwoDecimals(32.98)).toBe('32.98'); // Correctly returns 32.98!

    // Other floating-point problematic cases also work correctly
    expect(truncateToTwoDecimals(0.1 + 0.2)).toBe('0.30'); // 0.30000000000000004 -> '0.30'
    expect(truncateToTwoDecimals(1.005)).toBe('1.00'); // Consistently truncates to 1.00

    // Compare with truncateFloatByNDecimals which would fail on 32.98
    expect(truncateFloatByNDecimals(32.98, 2)).not.toBe(32.98); // Would be 32.97
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

  it('truncates (not rounds) and formats numbers with more than two decimals', () => {
    expect(formatCurrency(12.349)).toBe('$12.34');
    expect(formatCurrency(0.999)).toBe('$0.99');
    expect(formatCurrency(12.999)).toBe('$12.99');
    expect(formatCurrency(99.9999)).toBe('$99.99');
  });

  it('handles large numbers with thousands separators via Intl.NumberFormat', () => {
    expect(formatCurrency(1234567.89123)).toBe('$1,234,567.89');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    expect(formatCurrency(999999.99999)).toBe('$999,999.99');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles very small positive numbers', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
    expect(formatCurrency(0.001)).toBe('$0.00'); // truncates to 0.00
    expect(formatCurrency(0.0001)).toBe('$0.00');
  });

  it('handles floating-point edge cases with truncation', () => {
    // These test that truncateToTwoDecimals prevents floating-point rounding issues
    expect(formatCurrency(32.98)).toBe('$32.98');
    expect(formatCurrency(0.1 + 0.2)).toBe('$0.30'); // 0.30000000000000004 -> $0.30
    expect(formatCurrency(10.555)).toBe('$10.55'); // truncates, not rounds
  });

  it('handles edge cases with Intl.NumberFormat', () => {
    // NaN formatted by Intl.NumberFormat includes currency symbol
    expect(formatCurrency(NaN)).toBe('$NaN');

    // Infinity gets converted to NaN due to truncateToTwoDecimals behavior
    // truncateToTwoDecimals(Infinity) -> "Infinity.00" -> +("Infinity.00") -> NaN
    expect(formatCurrency(Infinity)).toBe('$NaN');
    expect(formatCurrency(-Infinity)).toBe('$NaN');
  });

  it('uses truncateToTwoDecimals to avoid floating-point surprises', () => {
    // Ensure we're using string-based truncation, not Math.trunc on scaled values
    // which would fail for cases like 32.98 (becomes 3297.9999999999995 when * 100)
    expect(formatCurrency(32.98)).toBe('$32.98');
    expect(formatCurrency(1.005)).toBe('$1.00'); // truncates to 1.00, doesn't round
  });
});

describe('truncateFloatByNDecimals', () => {
  it('truncates to 0 decimals (whole numbers)', () => {
    expect(truncateFloatByNDecimals(12.345, 0)).toBe(12);
    expect(truncateFloatByNDecimals(12.999, 0)).toBe(12);
    expect(truncateFloatByNDecimals(-12.345, 0)).toBe(-12);
    expect(truncateFloatByNDecimals(0.999, 0)).toBe(0);
  });

  it('truncates to 1 decimal place', () => {
    expect(truncateFloatByNDecimals(12.345, 1)).toBe(12.3);
    expect(truncateFloatByNDecimals(12.999, 1)).toBe(12.9);
    expect(truncateFloatByNDecimals(-12.345, 1)).toBe(-12.3);
    expect(truncateFloatByNDecimals(0.999, 1)).toBe(0.9);
  });

  it('truncates to 2 decimal places', () => {
    expect(truncateFloatByNDecimals(12.345, 2)).toBe(12.34);
    expect(truncateFloatByNDecimals(12.999, 2)).toBe(12.99);
    expect(truncateFloatByNDecimals(-12.345, 2)).toBe(-12.34);
    expect(truncateFloatByNDecimals(0.999, 2)).toBe(0.99);
  });

  it('exhibits floating-point precision issues (as documented in JSDoc)', () => {
    // WARNING: This test documents the floating-point precision bug mentioned in the JSDoc.
    // 32.98 * 100 evaluates to 3297.9999999999995, which Math.trunc turns into 3297,
    // resulting in 32.97 instead of the expected 32.98.
    expect(truncateFloatByNDecimals(32.98, 2)).toBe(32.97); // NOT 32.98!

    // More examples of this floating-point precision issue
    expect(truncateFloatByNDecimals(0.1 + 0.2, 2)).toBe(0.3); // This one happens to work

    // These may also exhibit precision issues depending on the implementation
    const result1 = truncateFloatByNDecimals(1.005, 2);
    // Could be 1.00 or 1.01 depending on floating-point representation
    expect([1.0, 1.01]).toContain(result1);
  });

  it('truncates to 3 decimal places', () => {
    expect(truncateFloatByNDecimals(12.3456, 3)).toBe(12.345);
    expect(truncateFloatByNDecimals(12.9999, 3)).toBe(12.999);
    expect(truncateFloatByNDecimals(-12.3456, 3)).toBe(-12.345);
    expect(truncateFloatByNDecimals(0.9999, 3)).toBe(0.999);
  });

  it('handles numbers with fewer decimal places than requested', () => {
    expect(truncateFloatByNDecimals(12.3, 2)).toBe(12.3);
    expect(truncateFloatByNDecimals(12, 2)).toBe(12);
    expect(truncateFloatByNDecimals(0, 3)).toBe(0);
  });

  it('handles edge cases', () => {
    expect(truncateFloatByNDecimals(0, 0)).toBe(0);
    expect(truncateFloatByNDecimals(0, 5)).toBe(0);
    expect(truncateFloatByNDecimals(Infinity, 2)).toBe(Infinity);
    expect(truncateFloatByNDecimals(-Infinity, 2)).toBe(-Infinity);
    expect(truncateFloatByNDecimals(NaN, 2)).toBeNaN();
  });

  it('handles very large numbers', () => {
    expect(truncateFloatByNDecimals(1234567.89123, 2)).toBe(1234567.89);
    expect(truncateFloatByNDecimals(999999999.999999, 3)).toBe(999999999.999);
  });

  it('handles very small numbers', () => {
    expect(truncateFloatByNDecimals(0.000123456, 4)).toBe(0.0001);
    expect(truncateFloatByNDecimals(0.000123456, 6)).toBe(0.000123);
  });

  it('handles negative decimal places (rounds to whole numbers)', () => {
    expect(truncateFloatByNDecimals(12.345, -1)).toBe(10);
    expect(truncateFloatByNDecimals(12.345, -2)).toBe(0);
    expect(truncateFloatByNDecimals(123.456, -1)).toBe(120);
    expect(truncateFloatByNDecimals(123.456, -2)).toBe(100);
  });
});
