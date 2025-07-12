// Define color pairs for consistent theming - each contains:
// [bg-light-mode, text-light-mode, bg-dark-mode, text-dark-mode]
const COLOR_PAIRS = [
  ["bg-purple-100", "text-purple-800", "bg-purple-700/50", "text-purple-100"],
  ["bg-teal-100", "text-teal-800", "bg-teal-700/50", "text-teal-100"],
  ["bg-amber-100", "text-amber-800", "bg-amber-700/50", "text-amber-100"],
  ["bg-pink-100", "text-pink-800", "bg-pink-700/50", "text-pink-100"],
  ["bg-green-100", "text-green-800", "bg-green-700/50", "text-green-100"],
  ["bg-rose-100", "text-rose-800", "bg-rose-700/50", "text-rose-100"],
  ["bg-indigo-100", "text-indigo-800", "bg-indigo-700/50", "text-indigo-100"],
  ["bg-cyan-100", "text-cyan-800", "bg-cyan-700/50", "text-cyan-100"],
  ["bg-orange-100", "text-orange-800", "bg-orange-700/50", "text-orange-100"],
  ["bg-blue-100", "text-blue-800", "bg-blue-700/50", "text-blue-100"],
  ["bg-lime-100", "text-lime-800", "bg-lime-700/50", "text-lime-100"],
  [
    "bg-fuchsia-100",
    "text-fuchsia-800",
    "bg-fuchsia-700/50",
    "text-fuchsia-100",
  ],
  ["bg-violet-100", "text-violet-800", "bg-violet-700/50", "text-violet-100"],
  ["bg-yellow-100", "text-yellow-800", "bg-yellow-700/50", "text-yellow-100"],
  [
    "bg-emerald-100",
    "text-emerald-800",
    "bg-emerald-700/50",
    "text-emerald-100",
  ],
];

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
