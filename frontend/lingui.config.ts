import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'es', 'fr', 'de', 'ja'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'src/locales/{locale}/messages',
      include: ['src/'],
    },
  ],
  compileNamespace: 'ts',
  format: 'po',
};

export default config;
