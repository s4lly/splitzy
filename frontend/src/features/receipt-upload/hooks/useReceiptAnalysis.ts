import receiptService from '@/services/receiptService';
import { useAuth } from '@clerk/clerk-react';
import { useMutation } from '@tanstack/react-query';
import type { ReceiptAnalysisResult } from '../types';

export function useReceiptAnalysisMutation() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
    }: {
      file: File;
    }): Promise<ReceiptAnalysisResult> => {
      const token = await getToken();

      return receiptService.analyzeReceipt(file, { token: token || undefined });
    },
    retry: false, // No retries for LLM calls
  });
}
