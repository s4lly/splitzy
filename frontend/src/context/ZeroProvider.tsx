import { mutators } from '@/zero/mutators';
import { schema, Schema } from '@/zero/schema';
import { useUser } from '@clerk/react-router';
import type { ZeroOptions } from '@rocicorp/zero';
import { ZeroProvider } from '@rocicorp/zero/react';
import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Spinner } from '@/components/ui/spinner';

// Zero environment variables
const ZERO_CACHE_URL = import.meta.env.VITE_ZERO_CACHE_URL;
const ZERO_QUERY_URL = import.meta.env.VITE_ZERO_QUERY_URL;
const ZERO_MUTATE_URL = import.meta.env.VITE_ZERO_MUTATE_URL;

if (!ZERO_CACHE_URL || !ZERO_QUERY_URL || !ZERO_MUTATE_URL) {
  throw new Error('Add your Zero URLs to the .env file');
}

/**
 * Get or create an anonymous user ID for unauthenticated users.
 * This is stored in localStorage to persist across page loads.
 */
function getAnonymousUserID(): string {
  let userID = localStorage.getItem('zero-anonymous-user-id');
  if (!userID) {
    userID = uuidv4();
    localStorage.setItem('zero-anonymous-user-id', userID);
  }
  return userID;
}

/**
 * ZeroProvider wrapper that derives userID from Clerk authentication.
 * Uses the authenticated Clerk user ID when available, otherwise falls back
 * to a persistent anonymous ID for unauthenticated collaborative sessions.
 */
export function AuthenticatedZeroProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();

  const zeroOptions: ZeroOptions<Schema> = useMemo(
    () => ({
      cacheURL: ZERO_CACHE_URL,
      queryURL: ZERO_QUERY_URL,
      mutateURL: ZERO_MUTATE_URL,
      schema,
      mutators: mutators,
      // Use Clerk user ID when authenticated, otherwise use persistent anonymous ID
      userID: user?.id ?? getAnonymousUserID(),
    }),
    [user?.id]
  );

  // Don't render Zero until Clerk has loaded to avoid creating a Zero instance
  // with an anonymous ID that immediately switches to an authenticated ID
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <ZeroProvider {...zeroOptions}>{children}</ZeroProvider>;
}
