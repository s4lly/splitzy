import { useQuery } from '@rocicorp/zero/react';
import { queries } from '@splitzy/shared-zero/queries';
import { Provider as JotaiProvider } from 'jotai';
import { Navigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  ReceiptProvider,
  ReceiptWithLineItems,
} from '@/context/ReceiptContext';
import { ReceiptCollabContent } from '@/features/receipt-collab/components/ReceiptCollabContent';
import { useReceiptNotFoundRetry } from '@/hooks/useReceiptNotFoundRetry';

/**
 * Root page component for collaborative receipt viewing/editing.
 * Canonical route: /r/:token
 *
 * Architecture:
 * - Fetches receipt data using Zero's useQuery keyed on share_token
 * - Wraps children with ReceiptProvider (React Context) for server state
 * - Wraps children with JotaiProvider for derived/modifiable state
 * - ReceiptCollabContent runs useReceiptSync to bridge Context -> Jotai
 */
const ReceiptCollabPage = () => {
  const { token } = useParams();

  const isValidToken = !!token && /^[A-Za-z0-9_-]{1,32}$/.test(token);

  const [receipt, details] = useQuery(
    queries.receipt.byShareToken({ token: isValidToken ? token : '' }),
    { enabled: isValidToken }
  );

  const { shouldNavigateTo404, retryMessage } = useReceiptNotFoundRetry({
    receipt,
    details,
  });

  if (!token || !isValidToken || shouldNavigateTo404) {
    return <Navigate to="/404" replace />;
  }

  if (details.type === 'unknown') {
    return <LoadingState message="Loading receipt details..." />;
  }

  if (details.type === 'error') {
    return <ErrorState message={details.error.message} />;
  }

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
