import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReceiptUploader } from '@/features/receipt-upload';
import receiptService from '@/services/receiptService';
import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { AlertCircle, LogIn } from 'lucide-react';
import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReceiptHistory = React.lazy(
  () => import('@/components/Receipt/ReceiptHistory')
);

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

        <Suspense fallback={null}>
          <SignedIn>
            <ReceiptHistory />
          </SignedIn>
        </Suspense>

        <SignedOut>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-8"
          >
            <Card className="border-2 border-dashed border-muted-foreground/30">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">
                  Sign in to view history
                </CardTitle>
                <CardDescription>
                  Create an account or sign in to see your receipt analysis
                  history and manage your documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <SignInButton />
              </CardContent>
            </Card>
          </motion.div>
        </SignedOut>
      </div>
    </div>
  );
};

export default HomePage;
