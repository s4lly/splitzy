import { Trans, useLingui } from '@lingui/react/macro';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLingui();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      title={
        theme === 'light' ? t`Switch to dark mode` : t`Switch to light mode`
      }
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">
        <Trans>Toggle theme</Trans>
      </span>
    </Button>
  );
}
