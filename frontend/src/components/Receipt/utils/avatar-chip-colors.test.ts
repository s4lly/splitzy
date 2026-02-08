import {
  DEFAULT_CHIP_COLOR,
  PALETTE,
  fnv1a32,
  getAvatarChipColors,
} from '@/components/Receipt/utils/avatar-chip-colors';
import { describe, expect, it } from 'vitest';

describe('DEFAULT_CHIP_COLOR', () => {
  it('has bg, text, and ring string properties', () => {
    expect(DEFAULT_CHIP_COLOR).toMatchObject({
      bg: expect.any(String),
      text: expect.any(String),
      ring: expect.any(String),
    });
  });

  it('uses neutral Tailwind classes for fallback styling', () => {
    expect(DEFAULT_CHIP_COLOR.bg).toMatch(/neutral/);
    expect(DEFAULT_CHIP_COLOR.text).toMatch(/neutral/);
    expect(DEFAULT_CHIP_COLOR.ring).toMatch(/neutral/);
  });

  it('is a valid chip color (same shape as PALETTE entries)', () => {
    const fromPalette = PALETTE[0];
    expect(Object.keys(DEFAULT_CHIP_COLOR).sort()).toEqual(
      Object.keys(fromPalette).sort()
    );
  });
});

describe('fnv1a32', () => {
  it('returns same hash for same input', () => {
    expect(fnv1a32('1:01HXYZ')).toBe(fnv1a32('1:01HXYZ'));
    expect(fnv1a32('')).toBe(fnv1a32(''));
  });

  it('returns different hashes for different inputs', () => {
    expect(fnv1a32('a')).not.toBe(fnv1a32('b'));
    expect(fnv1a32('1:01HXYZ')).not.toBe(fnv1a32('1:01HXYY'));
    expect(fnv1a32('1:01HXYZ')).not.toBe(fnv1a32('2:01HXYZ'));
  });

  it('returns unsigned 32-bit integer', () => {
    const h = fnv1a32('some key');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffff_ffff);
  });

  it('is deterministic for empty string', () => {
    const h = fnv1a32('');
    expect(fnv1a32('')).toBe(h);
  });
});

describe('getAvatarChipColors', () => {
  it('returns empty map when participantIds is empty', () => {
    const result = getAvatarChipColors(1, []);
    expect(result.size).toBe(0);
  });

  it('returns one entry for one participant', () => {
    const ids = ['01HXYZ123'];
    const result = getAvatarChipColors(42, ids);
    expect(result.size).toBe(1);
    const color = result.get('01HXYZ123');
    expect(color).toBeDefined();
    expect(color).toMatchObject({
      bg: expect.any(String),
      text: expect.any(String),
      ring: expect.any(String),
    });
    expect(PALETTE).toContainEqual(color);
  });

  it('is deterministic: same scopeId + same sorted ids give same map', () => {
    const ids = ['01B', '01A', '01C'];
    const a = getAvatarChipColors(1, ids);
    const b = getAvatarChipColors(1, ids);
    expect(a.size).toBe(b.size);
    for (const [id, color] of a) {
      expect(b.get(id)).toEqual(color);
    }
  });

  it('is order-independent: different input order gives same assignment', () => {
    const ids1 = ['01B', '01A', '01C'];
    const ids2 = ['01C', '01A', '01B'];
    const a = getAvatarChipColors(1, ids1);
    const b = getAvatarChipColors(1, ids2);
    expect(a.get('01A')).toEqual(b.get('01A'));
    expect(a.get('01B')).toEqual(b.get('01B'));
    expect(a.get('01C')).toEqual(b.get('01C'));
  });

  it('different scopeId gives different assignments for same ids', () => {
    const ids = ['01A', '01B'];
    const a = getAvatarChipColors(1, ids);
    const b = getAvatarChipColors(2, ids);
    const assignA = Object.fromEntries(a);
    const assignB = Object.fromEntries(b);
    expect(assignA).not.toEqual(assignB);
  });

  it('all returned colors are from PALETTE', () => {
    const ids = ['01A', '01B', '01C', '01D', '01E'];
    const result = getAvatarChipColors(100, ids);
    for (const color of result.values()) {
      const found = PALETTE.some(
        (p) =>
          p.bg === color.bg && p.text === color.text && p.ring === color.ring
      );
      expect(found).toBe(true);
    }
  });

  it('handles many participants (more than palette size) deterministically', () => {
    const ids = Array.from(
      { length: 30 },
      (_, i) => `01U${String(i).padStart(2, '0')}`
    );
    const result = getAvatarChipColors(1, ids);
    expect(result.size).toBe(30);
    const a = getAvatarChipColors(1, ids);
    const b = getAvatarChipColors(1, [...ids]);
    for (const id of ids) {
      expect(a.get(id)).toEqual(b.get(id));
    }
  });
});
