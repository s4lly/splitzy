import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthenticatedOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthenticatedOnly: React.FC<AuthenticatedOnlyProps> = ({
  children,
  fallback = null,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AuthenticatedOnly;
