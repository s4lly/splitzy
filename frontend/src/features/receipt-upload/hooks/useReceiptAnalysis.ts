import receiptService from '@/services/receiptService';
import { useMutation } from '@tanstack/react-query';
import type { ReceiptAnalysisResult } from '../types';

export function useReceiptAnalysisMutation() {
  return useMutation({
    mutationFn: ({
      file,
      preview,
    }: {
      file: File;
      preview: string | null;
    }): Promise<ReceiptAnalysisResult> => {
      // @ts-expect-error - receiptService.analyzeReceipt accepts string | null but TypeScript infers null | undefined from default parameter
      return receiptService.analyzeReceipt(file, preview);
    },
    retry: false, // No retries for LLM calls
  });
}
