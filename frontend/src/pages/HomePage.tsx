import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Database } from 'lucide-react';
import ModernReceiptUploader from '../components/Receipt/ModernReceiptUploader';
import ReceiptHistory from '../components/Receipt/ReceiptHistory';
import receiptService from '../services/receiptService';
import AuthenticatedOnly from '@/components/Auth/AuthenticatedOnly';

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
  
  const handleAnalysisComplete = (result) => {
    // Navigate to the analysis page for the newly created receipt
    if (result && result.success && result.receipt_data && result.receipt_data.id) {
      navigate(`/receipt/${result.receipt_data.id}`);
    } else {
      console.error('Invalid receipt data received:', result);
    }
  };
  
  return (
    <div className="px-1 sm:container py-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold mb-8 text-center"
      >
        Document Analysis Tool
      </motion.h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <ModernReceiptUploader onAnalysisComplete={handleAnalysisComplete} />
          
          {apiStatus === 'unhealthy' && (
            <div className="p-6 border-2 border-destructive/50 bg-destructive/10 rounded-lg flex items-center gap-3 text-base">
              <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
              <p className="text-destructive">API is currently unavailable. Please try again later.</p>
            </div>
          )}
        </motion.div>
        
        <AuthenticatedOnly>
          <ReceiptHistory />
        </AuthenticatedOnly>
      </div>
    </div>
  );
};

export default HomePage; 