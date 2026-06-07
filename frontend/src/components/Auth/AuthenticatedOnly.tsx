import { useAuth } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface AuthenticatedOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthenticatedOnly: React.FC<AuthenticatedOnlyProps> = ({
  children,
  fallback = null,
}) => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <output
        className="flex min-h-[60vh] items-center justify-center"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading…</span>
      </output>
    );
  }

  if (!isSignedIn) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AuthenticatedOnly;
