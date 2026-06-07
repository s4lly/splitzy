import { i18n } from '@lingui/core';

export { i18n };

export const SUPPORTED_LOCALES: Record<
  string,
  { label: string; flag: string }
> = {
  en: { label: 'English', flag: '🇬🇧' },
  es: { label: 'Español', flag: '🇪🇸' },
  fr: { label: 'Français', flag: '🇫🇷' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  ja: { label: '日本語', flag: '🇯🇵' },
  zh: { label: '中文', flag: '🇨🇳' },
};

const LOCALE_STORAGE_KEY = 'splitzy-locale';

export function getDefaultLocale(): string {
  // Check localStorage first
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && stored in SUPPORTED_LOCALES) {
    return stored;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (browserLang in SUPPORTED_LOCALES) {
    return browserLang;
  }

  return 'en';
}

function saveLocale(locale: string): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

const LOCALE_LOADERS: Record<string, () => Promise<{ messages: unknown }>> = {
  en: () => import('./locales/en/messages.ts'),
  es: () => import('./locales/es/messages.ts'),
  fr: () => import('./locales/fr/messages.ts'),
  de: () => import('./locales/de/messages.ts'),
  ja: () => import('./locales/ja/messages.ts'),
  zh: () => import('./locales/zh/messages.ts'),
};

export async function activateLocale(locale: string): Promise<void> {
  const loadMessages = LOCALE_LOADERS[locale] ?? LOCALE_LOADERS.en;
  const { messages } = await loadMessages();
  i18n.load(locale, messages as Parameters<typeof i18n.load>[1]);
  i18n.activate(locale);
  document.documentElement.lang = locale;
  saveLocale(locale);
}
