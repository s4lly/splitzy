// Define color pairs for consistent theming - each contains:
// [bg-light-mode, text-light-mode, bg-dark-mode, text-dark-mode]
const COLOR_PAIRS = [
  ['bg-purple-100', 'text-purple-800', 'bg-purple-700/50', 'text-purple-100'],
  ['bg-teal-100', 'text-teal-800', 'bg-teal-700/50', 'text-teal-100'],
  ['bg-amber-100', 'text-amber-800', 'bg-amber-700/50', 'text-amber-100'],
  ['bg-pink-100', 'text-pink-800', 'bg-pink-700/50', 'text-pink-100'],
  ['bg-green-100', 'text-green-800', 'bg-green-700/50', 'text-green-100'],
  ['bg-rose-100', 'text-rose-800', 'bg-rose-700/50', 'text-rose-100'],
  ['bg-indigo-100', 'text-indigo-800', 'bg-indigo-700/50', 'text-indigo-100'],
  ['bg-cyan-100', 'text-cyan-800', 'bg-cyan-700/50', 'text-cyan-100'],
  ['bg-orange-100', 'text-orange-800', 'bg-orange-700/50', 'text-orange-100'],
  ['bg-blue-100', 'text-blue-800', 'bg-blue-700/50', 'text-blue-100'],
  ['bg-lime-100', 'text-lime-800', 'bg-lime-700/50', 'text-lime-100'],
  [
    'bg-fuchsia-100',
    'text-fuchsia-800',
    'bg-fuchsia-700/50',
    'text-fuchsia-100',
  ],
  ['bg-violet-100', 'text-violet-800', 'bg-violet-700/50', 'text-violet-100'],
  ['bg-yellow-100', 'text-yellow-800', 'bg-yellow-700/50', 'text-yellow-100'],
  [
    'bg-emerald-100',
    'text-emerald-800',
    'bg-emerald-700/50',
    'text-emerald-100',
  ],
];

// Mapping from Tailwind classes to actual color values
const COLOR_VALUES: Record<string, { light: string; dark: string }> = {
  'bg-purple-100': { light: 'rgb(243 232 255)', dark: 'rgb(126 34 206 / 0.5)' },
  'text-purple-800': { light: 'rgb(107 33 168)', dark: 'rgb(243 232 255)' },
  'bg-teal-100': { light: 'rgb(204 251 241)', dark: 'rgb(15 118 110 / 0.5)' },
  'text-teal-800': { light: 'rgb(17 94 89)', dark: 'rgb(204 251 241)' },
  'bg-amber-100': { light: 'rgb(254 243 199)', dark: 'rgb(180 83 9 / 0.5)' },
  'text-amber-800': { light: 'rgb(146 64 14)', dark: 'rgb(254 243 199)' },
  'bg-pink-100': { light: 'rgb(252 231 243)', dark: 'rgb(190 24 93 / 0.5)' },
  'text-pink-800': { light: 'rgb(157 23 77)', dark: 'rgb(252 231 243)' },
  'bg-green-100': { light: 'rgb(220 252 231)', dark: 'rgb(21 128 61 / 0.5)' },
  'text-green-800': { light: 'rgb(22 101 52)', dark: 'rgb(220 252 231)' },
  'bg-rose-100': { light: 'rgb(255 228 230)', dark: 'rgb(190 18 60 / 0.5)' },
  'text-rose-800': { light: 'rgb(159 18 57)', dark: 'rgb(255 228 230)' },
  'bg-indigo-100': { light: 'rgb(224 231 255)', dark: 'rgb(67 56 202 / 0.5)' },
  'text-indigo-800': { light: 'rgb(55 48 163)', dark: 'rgb(224 231 255)' },
  'bg-cyan-100': { light: 'rgb(207 250 254)', dark: 'rgb(14 116 144 / 0.5)' },
  'text-cyan-800': { light: 'rgb(21 94 117)', dark: 'rgb(207 250 254)' },
  'bg-orange-100': { light: 'rgb(255 237 213)', dark: 'rgb(194 65 12 / 0.5)' },
  'text-orange-800': { light: 'rgb(154 52 18)', dark: 'rgb(255 237 213)' },
  'bg-blue-100': { light: 'rgb(219 234 254)', dark: 'rgb(29 78 216 / 0.5)' },
  'text-blue-800': { light: 'rgb(30 64 175)', dark: 'rgb(219 234 254)' },
  'bg-lime-100': { light: 'rgb(236 252 203)', dark: 'rgb(77 124 15 / 0.5)' },
  'text-lime-800': { light: 'rgb(63 98 18)', dark: 'rgb(236 252 203)' },
  'bg-fuchsia-100': {
    light: 'rgb(250 232 255)',
    dark: 'rgb(162 28 175 / 0.5)',
  },
  'text-fuchsia-800': { light: 'rgb(134 25 143)', dark: 'rgb(250 232 255)' },
  'bg-violet-100': { light: 'rgb(237 233 254)', dark: 'rgb(109 40 217 / 0.5)' },
  'text-violet-800': { light: 'rgb(91 33 182)', dark: 'rgb(237 233 254)' },
  'bg-yellow-100': { light: 'rgb(254 249 195)', dark: 'rgb(161 98 7 / 0.5)' },
  'text-yellow-800': { light: 'rgb(133 77 14)', dark: 'rgb(254 249 195)' },
  'bg-emerald-100': { light: 'rgb(209 250 229)', dark: 'rgb(5 150 105 / 0.5)' },
  'text-emerald-800': { light: 'rgb(6 95 70)', dark: 'rgb(209 250 229)' },
};

// Get a deterministic color based on a name and position
export const getColorForName = (name: string, index = 0, totalPeople = 1) => {
  // Always use index-based selection to ensure consistent color assignments
  // For single person or first person, use a safe default color
  if (totalPeople === 1 || index === 0) {
    // Use the first color in our reordered array, which is purple and looks good in dark mode
    return COLOR_PAIRS[0];
  }

  // For multiple people, distribute colors evenly
  if (totalPeople <= COLOR_PAIRS.length) {
    return COLOR_PAIRS[index % COLOR_PAIRS.length];
  }

  // For larger groups, use a combination of name hash and index
  let nameHash = 0;
  for (let i = 0; i < name.length; i++) {
    nameHash = (nameHash << 5) - nameHash + name.charCodeAt(i);
    nameHash = nameHash & nameHash; // Convert to 32bit integer
  }

  // Combine name hash with index for better distribution
  const combinedHash =
    (((nameHash + index * 7) % COLOR_PAIRS.length) + COLOR_PAIRS.length) %
    COLOR_PAIRS.length;
  return COLOR_PAIRS[combinedHash];
};

// Convert color pair to inline style with CSS variables
export const getColorStyle = (colorPair: string[]) => {
  const bgLight = COLOR_VALUES[colorPair[0]]?.light || 'rgb(243 232 255)';
  const textLight = COLOR_VALUES[colorPair[1]]?.light || 'rgb(107 33 168)';
  const bgDark = COLOR_VALUES[colorPair[2]]?.dark || 'rgb(126 34 206 / 0.5)';
  const textDark = COLOR_VALUES[colorPair[3]]?.dark || 'rgb(243 232 255)';

  return {
    '--bg-light': bgLight,
    '--text-light': textLight,
    '--bg-dark': bgDark,
    '--text-dark': textDark,
  } as React.CSSProperties;
};
