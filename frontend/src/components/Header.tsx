import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react';
import { Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* ---- Header Content ---- */}

      <nav
        aria-label="Main navigation"
        className="flex h-14 items-center px-1 sm:container"
      >
        <div className="mr-auto flex items-center gap-2 text-2xl font-bold">
          <Link to="/" className="flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Splitzy
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* ---- Auth ---- */}

          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  href="/receipts"
                  label="My Receipts"
                  labelIcon={<Receipt className="h-4 w-4" />}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>

          {/* ---- Language & Theme ---- */}

          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
