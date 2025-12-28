import ReceiptAnalysisDisplay from '@/components/Receipt/ReceiptAnalysisDisplay';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ReceiptImageViewer } from '@/features/receipt-image/ReceiptImageViewer';
import { generateImageFileName } from '@/features/receipt-image/utils/generateImageFileName';
import { fromTanStackResponse } from '@/models/transformers/fromTanStack';
import receiptService from '@/services/receiptService';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const ReceiptAnalysisPage = () => {
  const { receiptId } = useParams();

  const parsedId = receiptId ? parseInt(receiptId, 10) : NaN;
  const isValidId = !Number.isNaN(parsedId);

  const {
    data: receiptData,
    status: receiptDataStatus,
    error: receiptDataError,
    isLoading: receiptDataIsLoading,
  } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => receiptService.getSingleReceipt(isValidId ? parsedId : 0),
    enabled: isValidId,
  });

  // Transform receipt data once and reuse throughout the component
  const receipt = useMemo(() => {
    if (!receiptData?.receipt) return null;
    return fromTanStackResponse(receiptData);
  }, [receiptData]);

  // Generate filename for download from receipt data
  const imageFileName = generateImageFileName(receipt);

  // Extract error message for ErrorState component
  const errorMessage =
    receiptDataError instanceof Error
      ? receiptDataError.message
      : String(receiptDataError ?? 'Unknown error');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {receiptDataIsLoading ? (
        <LoadingState message="Loading receipt details..." />
      ) : receiptDataStatus === 'error' ? (
        <ErrorState message={errorMessage} />
      ) : (
        <div className="mx-auto max-w-4xl py-8">
          <div className="flex flex-col gap-6">
            <ReceiptImageViewer
              imageUrl={receipt?.imagePath ?? null}
              fileName={imageFileName}
            />

            {receipt && (
              <ReceiptAnalysisDisplay
                receipt={receipt}
                receiptId={receiptId ?? ''}
              />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReceiptAnalysisPage;
