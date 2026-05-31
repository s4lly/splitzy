import { useAuth } from '@clerk/react-router';
import { useQuery } from '@rocicorp/zero/react';
import { queries } from '@splitzy/shared-zero/queries';
import { Navigate, useParams } from 'react-router-dom';

import { LoadingState } from '@/components/shared/LoadingState';
import { useReceiptNotFoundRetry } from '@/hooks/useReceiptNotFoundRetry';

const LEGACY_ID_CUTOFF_MS = (() => {
  const raw = import.meta.env.VITE_LEGACY_ID_CUTOFF_ISO;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
})();

/**
 * Resolves a legacy `/receipts/:receiptId` (or `/receipt/:receiptId`) URL to
 * the canonical `/r/:token` URL by looking up the receipt's share_token via
 * Zero, then `<Navigate replace />`.
 *
 * Anonymous viewers can only resolve receipts created before
 * VITE_LEGACY_ID_CUTOFF_ISO — this matches the backend `legacy-preview`
 * gate and prevents enumeration of post-cutoff sequential ids by anonymous
 * clients. Signed-in users bypass the cutoff (their lookups are auditable
 * via the Clerk user id).
 */
export default function LegacyReceiptRedirect() {
  const { receiptId } = useParams();
  const { isLoaded, isSignedIn } = useAuth();

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

  if (!isLoaded || !receipt) {
    return <LoadingState message="Loading receipt…" />;
  }

  if (!receipt.share_token) {
    return <Navigate to="/404" replace />;
  }

  if (!isSignedIn) {
    if (
      LEGACY_ID_CUTOFF_MS === null ||
      receipt.created_at >= LEGACY_ID_CUTOFF_MS
    ) {
      return <Navigate to="/404" replace />;
    }
  }

  return <Navigate to={`/r/${receipt.share_token}`} replace />;
}
