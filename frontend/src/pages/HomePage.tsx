import ReceiptHistory from '@/components/Receipt/ReceiptHistory';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SignInPromptCard } from '@/features/auth/SignInPromptCard';
import { ReceiptUploader } from '@/features/receipt-upload';
import { useUserReceiptsQuery } from '@/hooks/useUserReceiptsQuery';
import receiptService from '@/services/receiptService';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { AlertCircle, Receipt } from 'lucide-react';
import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Wrapper component that uses the receipt query hook
 * Must be inside a Suspense boundary when using useSuspenseQuery
 */
const ReceiptHistorySection = () => {
  const { receipts } = useUserReceiptsQuery();
  return <ReceiptHistory receipts={receipts} loading={false} />;
};

/**
 * Loading fallback for Suspense boundary
 */
const ReceiptHistoryLoadingFallback = () => {
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Receipt History
        </CardTitle>
        <CardDescription>Your previously analyzed receipts</CardDescription>
      </CardHeader>
      <CardContent>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4">
            <Skeleton className="mb-2 h-24 w-full rounded-md" />
            <div className="flex justify-between">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState('checking');

  // Check API health
  React.useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const isHealthy = await receiptService.checkHealth();
        setApiStatus(isHealthy ? 'healthy' : 'unhealthy');
      } catch (error) {
        setApiStatus('unhealthy');
      }
    };

    checkApiHealth();
  }, []);

  const handleAnalysisComplete = (result: any) => {
    // Navigate to the analysis page for the newly created receipt
    if (
      result &&
      result.success &&
      result.receipt_data &&
      result.receipt_data.id
    ) {
      navigate(`/receipt/${result.receipt_data.id}`);
    } else {
      console.error('Invalid receipt data received:', result);
    }
  };

  return (
    <div className="px-1 py-8 sm:container">
      {/* Keep lg:grid-cols-2 for both states to maintain balanced layout with sign-in prompt */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <ReceiptUploader onAnalysisComplete={handleAnalysisComplete} />

          {apiStatus === 'unhealthy' && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-6 text-base">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-destructive" />
              <p className="text-destructive">
                API is currently unavailable. Please try again later.
              </p>
            </div>
          )}
        </motion.div>

        <SignedIn>
          <Suspense fallback={<ReceiptHistoryLoadingFallback />}>
            <ReceiptHistorySection />
          </Suspense>
        </SignedIn>

        <SignedOut>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <SignInPromptCard className="space-y-8" />
          </motion.div>
        </SignedOut>
      </div>
    </div>
  );
};

export default HomePage;
