import receiptService from '@/services/receiptService';
import { useCallback, useEffect, useState } from 'react';
import type { ReceiptAnalysisResult } from '../types';

interface UseReceiptUploadReturn {
  file: File | null;
  preview: string | null;
  isUploading: boolean;
  error: string | null;
  onDrop: (acceptedFiles: File[]) => void;
  handleSubmit: (e?: React.MouseEvent) => Promise<void>;
  clearFile: () => void;
}

export const useReceiptUpload = (
  onAnalysisComplete?: (result: ReceiptAnalysisResult) => void
): UseReceiptUploadReturn => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        // Revoke previous preview URL if it exists
        if (preview) {
          URL.revokeObjectURL(preview);
        }

        setFile(selectedFile);
        setError(null);

        // Create a preview URL
        const previewUrl = URL.createObjectURL(selectedFile);
        setPreview(previewUrl);
      }
    },
    [preview]
  );

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      // Pass the preview URL and provider to the receipt service
      // @ts-expect-error - receiptService.analyzeReceipt accepts string | null but TypeScript infers null | undefined from default parameter
      const result = await receiptService.analyzeReceipt(file, preview);

      if (result.success && result.is_receipt) {
        // Clear previous inputs
        setTimeout(() => {
          setFile(null);
          setPreview(null);
        }, 2000);

        // Call the onAnalysisComplete callback with the result
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else if (result.success && !result.is_receipt) {
        setError(
          'The uploaded image does not appear to be a payment document (receipt, invoice, bill, etc.). Please upload an image that contains items, prices, and totals.'
        );
      } else {
        setError(result.error || 'Failed to analyze document');
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      setError(
        'An error occurred while analyzing the document. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setError(null);
  }, [preview]);

  // Cleanup effect to revoke blob URL when preview changes or component unmounts
  useEffect(() => {
    // Store the current preview URL to revoke on cleanup
    const currentPreview = preview;

    return () => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [preview]);

  return {
    file,
    preview,
    isUploading,
    error,
    onDrop,
    handleSubmit,
    clearFile,
  };
};
