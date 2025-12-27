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

  const [data, details] = useQuery(
    queries.receipts.byId({ id: isValidId ? parsedId : 0 }),
    { enabled: isValidId }
  );

  // Redirect to 404 if receiptId is missing or not a valid number
  if (!receiptId || !isValidId) {
    return <Navigate to="/404" replace />;
  }

  // Handle loading state
  if (details.type === 'unknown') {
    return <LoadingState />;
  }

  // Handle error state
  if (details.type === 'error') {
    return <ErrorState message={details.error.message} />;
  }

  // Extract receipt from data array
  const [receipt] = data;

  // Handle not found
  if (!receipt) {
    return <Navigate to="/404" replace />;
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
