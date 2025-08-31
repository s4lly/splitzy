import {
  formatCurrency,
  truncateToTwoDecimals,
  truncateFloatByNDecimals,
} from './format-currency';
import { describe, it, expect } from 'vitest';

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
});

describe('formatCurrency', () => {
  it('formats positive numbers as $X.XX', () => {
    expect(formatCurrency(12.34)).toBe('$12.34');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1000)).toBe('$1000.00');
  });

  it('formats negative numbers as $-X.XX', () => {
    expect(formatCurrency(-12.34)).toBe('$-12.34');
    expect(formatCurrency(-0.01)).toBe('$-0.01');
  });

  it('truncates and formats numbers with more than two decimals', () => {
    expect(formatCurrency(12.349)).toBe('$12.34');
    expect(formatCurrency(0.999)).toBe('$0.99');
  });

  it('handles large numbers', () => {
    expect(formatCurrency(1234567.89123)).toBe('$1234567.89');
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
