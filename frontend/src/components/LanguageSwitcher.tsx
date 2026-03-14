import { useLingui } from '@lingui/react/macro';
import { Globe } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { activateLocale, SUPPORTED_LOCALES } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useLingui();
  const [isSwitching, setIsSwitching] = useState(false);
  const lastRequestedLocale = useRef<string | null>(null);

  const handleLocaleChange = useCallback(
    async (code: string) => {
      if (isSwitching) return;
      lastRequestedLocale.current = code;
      setIsSwitching(true);
      try {
        await activateLocale(code);
        if (lastRequestedLocale.current !== code) return;
      } catch (error) {
        console.error(`Failed to switch locale to "${code}":`, error);
      } finally {
        setIsSwitching(false);
      }
    },
    [isSwitching]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t`Change language`}>
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t`Change language`}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(SUPPORTED_LOCALES).map(([code, { label, flag }]) => (
          <DropdownMenuItem
            key={code}
            disabled={isSwitching}
            onClick={() => handleLocaleChange(code)}
            className={i18n.locale === code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{flag}</span>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
