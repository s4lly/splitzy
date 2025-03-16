import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Database } from 'lucide-react';
import ModernReceiptUploader from '../components/Receipt/ModernReceiptUploader';
import ReceiptHistory from '../components/Receipt/ReceiptHistory';
import receiptService from '../services/receiptService';

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
          
          {apiStatus === 'healthy' && (
            <motion.div 
              className="p-8 border-2 border-border rounded-lg bg-card text-center shadow-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Database className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-3">Ready to Analyze</h3>
              <p className="text-base text-muted-foreground">
                Upload a receipt, invoice, or bill image above to see the analysis results, or view previous documents below.
              </p>
            </motion.div>
          )}
        </motion.div>
        
        <div>
          <ReceiptHistory />
        </div>
      </div>
    </div>
  );
};

export default HomePage; 