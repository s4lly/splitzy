import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  ReceiptProvider,
  ReceiptWithLineItems,
} from '@/context/ReceiptContext';
import { ReceiptCollabContent } from '@/features/receipt-collab/components/ReceiptCollabContent';
import { useReceiptNotFoundRetry } from '@/hooks/useReceiptNotFoundRetry';
import { queries } from '@/zero/queries';
import { useQuery } from '@rocicorp/zero/react';
import { Provider as JotaiProvider } from 'jotai';
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

  const parsedId = receiptId ? parseInt(receiptId, 10) : NaN;
  const isValidId = !Number.isNaN(parsedId);

  const [receipt, details] = useQuery(
    queries.receipt.byId({ id: isValidId ? parsedId : 0 }),
    { enabled: isValidId }
  );

  const { shouldNavigateTo404, retryMessage } = useReceiptNotFoundRetry({
    receipt,
    details,
  });

  // Redirect to 404 if receiptId is missing or not a valid number or not found after all retries exhausted
  if (!receiptId || !isValidId || shouldNavigateTo404) {
    return <Navigate to="/404" replace />;
  }

  // Handle loading state
  if (details.type === 'unknown') {
    return <LoadingState message="Loading receipt details..." />;
  }

  // Handle error state
  if (details.type === 'error') {
    return <ErrorState message={details.error.message} />;
  }

  // Still loading/retrying if no receipt yet
  if (!receipt) {
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
