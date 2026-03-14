import { deDE, enGB, esES, frFR, jaJP } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/react-router';
import { useLingui } from '@lingui/react';
import type { ReactNode } from 'react';

const CLERK_LOCALIZATIONS: Record<string, typeof enGB> = {
  en: enGB,
  es: esES,
  fr: frFR,
  de: deDE,
  ja: jaJP,
};

interface LocalizedClerkProviderProps {
  publishableKey: string;
  children: ReactNode;
}

export function LocalizedClerkProvider({
  publishableKey,
  children,
}: LocalizedClerkProviderProps) {
  const { i18n } = useLingui();
  const localization = CLERK_LOCALIZATIONS[i18n.locale];

  return (
    <ClerkProvider publishableKey={publishableKey} localization={localization}>
      {children}
    </ClerkProvider>
  );
}
