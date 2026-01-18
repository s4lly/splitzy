import { useQuery } from '@rocicorp/zero/react';
import { useEffect, useState } from 'react';

// Infer QueryDetails type from useQuery return type
type QueryDetails = ReturnType<typeof useQuery>[1];

interface UseReceiptNotFoundRetryOptions {
  receipt: unknown;
  details: QueryDetails;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface UseReceiptNotFoundRetryResult {
  shouldNavigateTo404: boolean;
  retryMessage: string;
}

/**
 * Hook that handles retry logic for receipt not found scenarios.
 * Tracks retry attempts and determines when to navigate to 404.
 */
export const useReceiptNotFoundRetry = ({
  receipt,
  details,
  maxRetries = 3,
  retryDelayMs = 1000,
}: UseReceiptNotFoundRetryOptions): UseReceiptNotFoundRetryResult => {
  const [retryCount, setRetryCount] = useState(0);
  const [notFoundStartTime, setNotFoundStartTime] = useState<number | null>(
    null
  );

  // Track when we first detect receipt not found
  useEffect(() => {
    if (details.type === 'complete' && !receipt && notFoundStartTime === null) {
      setNotFoundStartTime(Date.now());
      setRetryCount(0);
    } else if (receipt) {
      // Receipt found, reset tracking
      setNotFoundStartTime(null);
      setRetryCount(0);
    } else if (details.type !== 'complete' && notFoundStartTime !== null) {
      setNotFoundStartTime(null);
      setRetryCount(0);
    }
  }, [details.type, receipt, notFoundStartTime]);

  // Handle retry logic with interval timer
  useEffect(() => {
    // Only start timer when conditions are met
    if (notFoundStartTime === null || details.type !== 'complete' || receipt) {
      return;
    }

    // Check if we've already exceeded max retry time
    const initialElapsed = Date.now() - notFoundStartTime;
    if (initialElapsed >= maxRetries * retryDelayMs) {
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - notFoundStartTime;
      const newRetryCount = Math.floor(elapsed / retryDelayMs);

      setRetryCount(Math.min(newRetryCount, maxRetries));

      // Stop interval once max retries reached
      if (newRetryCount >= maxRetries) {
        clearInterval(intervalId);
      }
    }, retryDelayMs);

    // Cleanup on dependency change or unmount
    return () => clearInterval(intervalId);
  }, [notFoundStartTime, details.type, receipt, maxRetries, retryDelayMs]);

  // Determine if we should navigate to 404
  const shouldNavigateTo404 =
    !receipt &&
    details.type === 'complete' &&
    notFoundStartTime !== null &&
    Date.now() - notFoundStartTime >= maxRetries * retryDelayMs;

  // Generate retry message
  const retryMessage =
    retryCount > 0
      ? `Loading receipt details... (retry ${retryCount}/${maxRetries})`
      : 'Loading receipt details...';

  return {
    shouldNavigateTo404,
    retryMessage,
  };
};
