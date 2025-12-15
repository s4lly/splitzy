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
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AuthenticatedOnly;
