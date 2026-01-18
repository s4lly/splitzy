import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { mutators } from '@/zero/mutators';
import { Schema, schema } from '@/zero/schema';
import { useAuth } from '@clerk/react-router';
import type { ZeroOptions } from '@rocicorp/zero';
import { ZeroProvider } from '@rocicorp/zero/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Zero environment variables
const ZERO_CACHE_URL = import.meta.env.VITE_ZERO_CACHE_URL;
const ZERO_QUERY_URL = import.meta.env.VITE_ZERO_QUERY_URL;
const ZERO_MUTATE_URL = import.meta.env.VITE_ZERO_MUTATE_URL;

if (!ZERO_CACHE_URL || !ZERO_QUERY_URL || !ZERO_MUTATE_URL) {
  throw new Error('Add your Zero URLs to the .env file');
}

const ZERO_ANONYMOUS_USER_ID_KEY = 'zero-anonymous-user-id';

/**
 * Get or create an anonymous user ID for unauthenticated users.
 * This is stored in localStorage to persist across page loads.
 */
function getAnonymousUserID(): string {
  let userID = localStorage.getItem(ZERO_ANONYMOUS_USER_ID_KEY);

  if (!userID) {
    userID = uuidv4();
    localStorage.setItem(ZERO_ANONYMOUS_USER_ID_KEY, userID);
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
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { userId, isLoaded, getToken } = useAuth();

  const fetchToken = useCallback(async () => {
    try {
      setIsRetrying(false);
      const fetchedToken = await getToken();
      setToken(fetchedToken);
      setTokenError(null);
    } catch (error) {
      setTokenError(error as Error);
      // For anonymous users, null token is expected, so set it explicitly
      // For authenticated users, this is an error state
      setToken(null);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    fetchToken();
  }, [fetchToken, userId, isLoaded]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchToken();
  };

  const zeroOptions: ZeroOptions<Schema> = useMemo(
    () => ({
      cacheURL: ZERO_CACHE_URL,
      queryURL: ZERO_QUERY_URL,
      mutateURL: ZERO_MUTATE_URL,
      schema,
      mutators: mutators,
      // Use Clerk user ID when authenticated, otherwise use persistent anonymous ID
      userID: userId ?? getAnonymousUserID(),
      auth: token,
      context: {
        userID: userId ?? null,
      },
    }),
    [userId, token]
  );

  // Don't render Zero until Clerk has loaded to avoid creating a Zero instance
  // with an anonymous ID that immediately switches to an authenticated ID.
  // For authenticated users, also wait for token. Anonymous users can proceed with null token.
  if (!isLoaded || (userId && !token && !tokenError)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  // Show error state for authenticated users who encountered a token fetch error
  // Anonymous users can proceed with null token (expected behavior)
  if (userId && tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              Failed to fetch authentication token. Your requests may not be
              properly authenticated.
            </p>
            {tokenError.message && (
              <p className="mb-4 text-xs opacity-80">{tokenError.message}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 size-4" />
                  Retry
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ZeroProvider {...zeroOptions}>{children}</ZeroProvider>;
}
