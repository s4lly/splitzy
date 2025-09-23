import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Database, LogIn } from 'lucide-react';
import ModernReceiptUploader from '../components/Receipt/ModernReceiptUploader';
import receiptService from '../services/receiptService';
import AuthenticatedOnly from '@/components/Auth/AuthenticatedOnly';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

const ReceiptHistory = React.lazy(
  () => import('../components/Receipt/ReceiptHistory')
);

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
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

  const handleSignInClick = () => {
    navigate('/auth');
  };

  return (
    <div className="px-1 py-8 sm:container">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center text-3xl font-bold"
      >
        Document Analysis Tool
      </motion.h1>

      {/* Keep lg:grid-cols-2 for both states to maintain balanced layout with sign-in prompt */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <ModernReceiptUploader onAnalysisComplete={handleAnalysisComplete} />

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
          <AuthenticatedOnly>
            <ReceiptHistory />
          </AuthenticatedOnly>
        </Suspense>

        {!authLoading && !isAuthenticated && apiStatus !== 'unhealthy' && (
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
                <Button onClick={handleSignInClick} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
