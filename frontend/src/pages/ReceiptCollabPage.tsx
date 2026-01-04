import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  ReceiptProvider,
  ReceiptWithLineItems,
} from '@/context/ReceiptContext';
import { ReceiptCollabContent } from '@/features/receipt-collab/components/ReceiptCollabContent';
import { queries } from '@/zero/queries';
import { useQuery } from '@rocicorp/zero/react';
import { Provider as JotaiProvider } from 'jotai';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * Root page component for collaborative receipt viewing/editing.
 *
 * Architecture:
 * - Fetches receipt data using Zero's useQuery
 * - Wraps children with ReceiptProvider (React Context) for server state
 * - Wraps children with JotaiProvider for derived/modifiable state
 * - ReceiptCollabContent runs useReceiptSync to bridge Context -> Jotai
 */
const ReceiptCollabPage = () => {
  const { receiptId } = useParams();
  const [retryCount, setRetryCount] = useState(0);
  const [notFoundStartTime, setNotFoundStartTime] = useState<number | null>(
    null
  );
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000; // 1 second between retries

  const parsedId = receiptId ? parseInt(receiptId, 10) : NaN;
  const isValidId = !Number.isNaN(parsedId);

  const [data, details] = useQuery(
    queries.receipts.byId({ id: isValidId ? parsedId : 0 }),
    { enabled: isValidId }
  );

  // Redirect to 404 if receiptId is missing or not a valid number
  if (!receiptId || !isValidId) {
    return <Navigate to="/404" replace />;
  }

  // Track when we first detect receipt not found
  useEffect(() => {
    if (
      details.type === 'complete' &&
      !data?.[0] &&
      notFoundStartTime === null
    ) {
      setNotFoundStartTime(Date.now());
      setRetryCount(0);
    } else if (data?.[0]) {
      // Receipt found, reset tracking
      setNotFoundStartTime(null);
      setRetryCount(0);
    }
  }, [details.type, data, notFoundStartTime]);

  // Handle retry logic with interval timer
  useEffect(() => {
    // Only start timer when conditions are met
    if (
      notFoundStartTime === null ||
      details.type !== 'complete' ||
      data?.[0]
    ) {
      return;
    }

    // Check if we've already exceeded max retry time
    const initialElapsed = Date.now() - notFoundStartTime;
    if (initialElapsed >= MAX_RETRIES * RETRY_DELAY_MS) {
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - notFoundStartTime;
      const newRetryCount = Math.floor(elapsed / RETRY_DELAY_MS);

      setRetryCount(Math.min(newRetryCount, MAX_RETRIES));

      // Stop interval once max retries reached
      if (newRetryCount >= MAX_RETRIES) {
        clearInterval(intervalId);
      }
    }, RETRY_DELAY_MS);

    // Cleanup on dependency change or unmount
    return () => clearInterval(intervalId);
  }, [notFoundStartTime, details.type, data]);

  // Handle loading state
  if (details.type === 'unknown') {
    return <LoadingState message="Loading receipt details..." />;
  }

  // Handle error state
  if (details.type === 'error') {
    return <ErrorState message={details.error.message} />;
  }

  // Extract receipt from data array
  const [receipt] = data;

  // Handle not found after all retries exhausted
  if (
    !receipt &&
    details.type === 'complete' &&
    notFoundStartTime !== null &&
    Date.now() - notFoundStartTime >= MAX_RETRIES * RETRY_DELAY_MS
  ) {
    return <Navigate to="/404" replace />;
  }

  // Still loading/retrying if no receipt yet
  if (!receipt) {
    const retryMessage =
      retryCount > 0
        ? `Loading receipt details... (retry ${retryCount}/${MAX_RETRIES})`
        : 'Loading receipt details...';

    return <LoadingState message={retryMessage} />;
  }

  return (
    <ReceiptProvider
      receipt={receipt as ReceiptWithLineItems}
      status={details.type}
    >
      <JotaiProvider>
        <ReceiptCollabContent />
      </JotaiProvider>
    </ReceiptProvider>
  );
};

export default ReceiptCollabPage;
