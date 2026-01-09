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
      console.log('[useReceiptAnalysis] Attempting to retrieve Clerk token...');

      let token: string | null = null;
      try {
        token = await getToken();

        if (token) {
          console.log('[useReceiptAnalysis] Token retrieved successfully', {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 20) + '...',
          });
        } else {
          console.warn(
            '[useReceiptAnalysis] getToken() returned null or undefined'
          );
        }
      } catch (error) {
        console.error('[useReceiptAnalysis] Error retrieving token:', error);
        if (error instanceof Error) {
          console.error('[useReceiptAnalysis] Error details:', {
            message: error.message,
            stack: error.stack,
          });
        }
        // Continue without token - let the backend handle authentication
      }

      const tokenToUse = token || undefined;
      console.log('[useReceiptAnalysis] Calling analyzeReceipt with token:', {
        hasToken: !!tokenToUse,
        tokenLength: tokenToUse?.length || 0,
      });

      return receiptService.analyzeReceipt(file, { token: tokenToUse });
    },
    retry: false, // No retries for LLM calls
  });
}
