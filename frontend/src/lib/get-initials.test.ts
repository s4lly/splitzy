import { describe, expect, it } from 'vitest';

import { getInitials } from '@/lib/get-initials';

describe('getInitials', () => {
  it('returns empty string when name is empty', () => {
    // Scenario: empty string produces no parts after trim/split, so we return ''.
    const result = getInitials('');
    expect(result).toBe('');
  });

  it('returns empty string when name is only whitespace', () => {
    // Scenario: trim removes spaces; split on whitespace yields empty array, so we return ''.
    const result = getInitials('   ');
    expect(result).toBe('');
  });

  it('returns single initial for one word (first-name-only path)', () => {
    // Scenario: one part only; the "no last name" branch applies — we use first initial only.
    const result = getInitials('Alice');
    expect(result).toBe('A');
  });

  it('returns two initials for first and last name', () => {
    // Scenario: two parts; both first-initial and last-initial branches apply.
    const result = getInitials('John Doe');
    expect(result).toBe('JD');
  });

  it('returns first + last initial for multiple middle names', () => {
    // Scenario: more than two parts; we take first part and last part (middle names ignored).
    const result = getInitials('Mary Jane Watson');
    expect(result).toBe('MW');
  });

  it('uppercases initials from lowercase input', () => {
    // Scenario: output is always uppercase regardless of input case.
    const result = getInitials('john doe');
    expect(result).toBe('JD');
  });

  it('trims leading and trailing whitespace before splitting', () => {
    // Scenario: trim() is applied first, so surrounding spaces do not create empty parts.
    const result = getInitials('  John Doe  ');
    expect(result).toBe('JD');
  });

  it('handles single character as name', () => {
    // Scenario: one part of length 1 still yields one initial.
    const result = getInitials('X');
    expect(result).toBe('X');
  });

  it('handles two single-character names', () => {
    // Scenario: two parts, each one character; both initials used.
    const result = getInitials('A B');
    expect(result).toBe('AB');
  });
});
