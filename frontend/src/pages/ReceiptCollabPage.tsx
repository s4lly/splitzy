import { Button } from '@/components/ui/button';
import {
  ReceiptProvider,
  ReceiptWithLineItems,
} from '@/context/ReceiptContext';
import { useReceiptSync } from '@/features/receipt-collab/hooks/useReceiptSync';
import { ReceiptViewer } from '@/features/receipt-viewer/ReceiptViewer';
import { motion } from 'framer-motion';
import { Provider as JotaiProvider } from 'jotai';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { queries } from '@/zero/queries';
import { useQuery } from '@rocicorp/zero/react';

/**
 * Inner component that has access to both ReceiptContext and Jotai.
 * This is where the sync hook runs and child components are rendered.
 */
const ReceiptCollabContent = () => {
  const navigate = useNavigate();

  // Sync receipt from Context into Jotai atoms
  useReceiptSync();

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="mx-auto max-w-4xl space-y-4 py-8">
        <div>
          <Button variant="ghost" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Child components can now use:
              - useReceiptContext() for direct receipt access
              - useAtomValue(receiptTotalAtom) for derived values
              - useAtom(personTotalsAtom) for modifiable derived values
          */}
          <ReceiptViewer />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Loading state component
 */
const LoadingState = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <span className="ml-2 text-lg">Loading receipt...</span>
  </div>
);

/**
 * Error state component
 */
const ErrorState = ({ message }: { message: string }) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl py-8">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
        <h2 className="font-semibold text-destructive">
          Error Loading Receipt
        </h2>
        <p className="text-destructive/90">{message}</p>
      </div>
    </div>
  );
};

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
