import { useLingui } from '@lingui/react';
import { Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { activateLocale, SUPPORTED_LOCALES } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n } = useLingui();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Change language">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(SUPPORTED_LOCALES).map(([code, { label, flag }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => activateLocale(code)}
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
