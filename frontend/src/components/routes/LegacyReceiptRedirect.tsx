import { useQuery } from '@rocicorp/zero/react';
import { queries } from '@splitzy/shared-zero/queries';
import { Navigate, useParams } from 'react-router-dom';

import { LoadingState } from '@/components/shared/LoadingState';
import { useReceiptNotFoundRetry } from '@/hooks/useReceiptNotFoundRetry';

/**
 * Resolves a legacy `/receipts/:receiptId` (or `/receipt/:receiptId`) URL to
 * the canonical `/r/:token` URL by looking up the receipt's share_token via
 * Zero, then `<Navigate replace />` so the URL bar matches the canonical
 * share URL going forward. Works for any viewer (auth or anonymous) since
 * Zero permissions on receipts are public.
 */
export default function LegacyReceiptRedirect() {
  const { receiptId } = useParams();

  const parsedId = receiptId ? parseInt(receiptId, 10) : NaN;
  const isValidId = !Number.isNaN(parsedId);

  const [receipt, details] = useQuery(
    queries.receipt.byId({ id: isValidId ? parsedId : 0 }),
    { enabled: isValidId }
  );

  const { shouldNavigateTo404 } = useReceiptNotFoundRetry({
    receipt,
    details,
  });

  if (
    !receiptId ||
    !isValidId ||
    shouldNavigateTo404 ||
    details.type === 'error'
  ) {
    return <Navigate to="/404" replace />;
  }

  if (!receipt) {
    return <LoadingState message="Loading receipt…" />;
  }

  if (!receipt.share_token) {
    return <Navigate to="/404" replace />;
  }

  return <Navigate to={`/r/${receipt.share_token}`} replace />;
}
