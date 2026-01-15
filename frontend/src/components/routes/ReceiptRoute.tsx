import ReceiptAnalysisPage from '@/pages/ReceiptAnalysisPage';
import ReceiptCollabPage from '@/pages/ReceiptCollabPage';
import { Loader2 } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';

export default function ReceiptRoute() {
  const isCollabEnabled = useFeatureFlagEnabled('receipt-collab-edit');

  // Wait for PostHog to initialize - don't render either page until flag resolves
  if (isCollabEnabled === undefined) {
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

  return isCollabEnabled ? <ReceiptCollabPage /> : <ReceiptAnalysisPage />;
}
