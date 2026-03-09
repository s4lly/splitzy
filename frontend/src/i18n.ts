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

export function saveLocale(locale: string): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export async function activateLocale(locale: string): Promise<void> {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
  document.documentElement.lang = locale;
  saveLocale(locale);
}
