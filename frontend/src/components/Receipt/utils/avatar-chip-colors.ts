/**
 * Avatar chip color assignment: deterministic, order-independent colors for
 * participant avatars based on scopeId + participant ID, with FNV-1a hashing
 * and collision resolution. Reusable for receipts, meals, or any other scope.
 */

export type AvatarChipColor = {
  bg: string;
  text: string;
  ring: string;
};

/** Default neutral chip color when a participant has no assigned color (e.g. missing from scope). */
export const DEFAULT_CHIP_COLOR: AvatarChipColor = {
  bg: 'bg-neutral-100 dark:bg-neutral-700',
  text: 'text-neutral-800 dark:text-neutral-200',
  ring: 'ring-neutral-200 dark:ring-neutral-600',
};

/** Curated palette (14 entries) – warm/earthy tones to match site theme. All classes are literal Tailwind strings for purge safety. */
export const PALETTE: AvatarChipColor[] = [
  // 1 – Terracotta
  {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-200',
    ring: 'ring-red-200 dark:ring-red-800',
  },
  // 2 – Coral
  {
    bg: 'bg-orange-100 dark:bg-orange-900',
    text: 'text-orange-800 dark:text-orange-200',
    ring: 'ring-orange-200 dark:ring-orange-800',
  },
  // 3 – Honey
  {
    bg: 'bg-amber-100 dark:bg-amber-900',
    text: 'text-amber-800 dark:text-amber-200',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  // 4 – Sunflower
  {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    ring: 'ring-yellow-200 dark:ring-yellow-800',
  },
  // 5 – Sage
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900',
    text: 'text-emerald-800 dark:text-emerald-200',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  // 6 – Forest
  {
    bg: 'bg-teal-100 dark:bg-teal-900',
    text: 'text-teal-800 dark:text-teal-200',
    ring: 'ring-teal-200 dark:ring-teal-800',
  },
  // 7 – Navy
  {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    ring: 'ring-blue-200 dark:ring-blue-800',
  },
  // 8 – Dusk
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900',
    text: 'text-indigo-800 dark:text-indigo-200',
    ring: 'ring-indigo-200 dark:ring-indigo-800',
  },
  // 9 – Plum
  {
    bg: 'bg-violet-100 dark:bg-violet-900',
    text: 'text-violet-800 dark:text-violet-200',
    ring: 'ring-violet-200 dark:ring-violet-800',
  },
  // 10 – Blush
  {
    bg: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-800 dark:text-pink-200',
    ring: 'ring-pink-200 dark:ring-pink-800',
  },
  // 11 – Rose
  {
    bg: 'bg-rose-100 dark:bg-rose-900',
    text: 'text-rose-800 dark:text-rose-200',
    ring: 'ring-rose-200 dark:ring-rose-800',
  },
  // 12 – Sandstone
  {
    bg: 'bg-stone-200 dark:bg-stone-700',
    text: 'text-stone-800 dark:text-stone-200',
    ring: 'ring-stone-300 dark:ring-stone-600',
  },
  // 13 – Warm slate
  {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-800 dark:text-slate-200',
    ring: 'ring-slate-200 dark:ring-slate-700',
  },
  // 14 – Deep amber
  {
    bg: 'bg-amber-200 dark:bg-amber-800',
    text: 'text-amber-900 dark:text-amber-100',
    ring: 'ring-amber-300 dark:ring-amber-700',
  },
];

const PALETTE_LEN = PALETTE.length;

/**
 * FNV-1a 32-bit hash (no external dependencies). Deterministic for same input.
 */
export function fnv1a32(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Returns a map of participant ID -> avatar chip color for the given scope.
 * Deterministic and order-independent: uses sorted participant IDs and FNV-1a
 * over scopeId:participantId. Collisions are resolved by linear probing; if
 * participants exceed palette size, colors repeat deterministically.
 *
 * @param scopeId - Scope identifier (e.g. receipt id, meal id, group id).
 * @param participantIds - Participant identifiers (e.g. ULIDs).
 */
export function getAvatarChipColors(
  scopeId: number,
  participantIds: string[]
): Map<string, AvatarChipColor> {
  const sorted = [...participantIds].sort();
  const used = new Set<number>();
  const result = new Map<string, AvatarChipColor>();

  for (const id of sorted) {
    const key = `${scopeId}:${id}`;
    const preferred = fnv1a32(key) % PALETTE_LEN;

    let index: number;
    if (!used.has(preferred)) {
      index = preferred;
      used.add(index);
    } else if (used.size >= PALETTE_LEN) {
      // Palette saturated; skip linear probe and use preferred (repeated color)
      index = preferred;
    } else {
      let probe = (preferred + 1) % PALETTE_LEN;
      while (probe !== preferred && used.has(probe)) {
        probe = (probe + 1) % PALETTE_LEN;
      }
      if (!used.has(probe)) {
        index = probe;
        used.add(index);
      } else {
        index = preferred;
      }
    }

    result.set(id, PALETTE[index]);
  }

  return result;
}
