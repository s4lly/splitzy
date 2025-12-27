# Project Instructions

## Linting & Formatting

### ESLint

- **No relative imports** - use `@/` alias instead of `../`

### Prettier

- **Tailwind class sorting** - via prettier-plugin-tailwindcss
- Formats Tailwind in `clsx()`, `cn()`, `cva()` functions

## Import Rules

- **No barrel files** - Never create `index.ts` or `index.tsx` barrel/re-export files. Always import directly from the source file (e.g., `import { Component } from '@/features/my-feature/Component'` instead of `import { Component } from '@/features/my-feature'`)
