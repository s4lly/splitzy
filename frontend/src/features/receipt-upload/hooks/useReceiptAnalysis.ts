import { useAuth } from '@clerk/clerk-react';
import { useMutation } from '@tanstack/react-query';

import type { ReceiptAnalysisResult } from '../types';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = tokenToUse
        ? { Authorization: `Bearer ${tokenToUse}` }
        : {};

      const response = await fetch(`${API_URL}/analyze-receipt`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Receipt analysis failed: ${response.statusText}`);
      }

      return response.json();
    },
    retry: false, // No retries for LLM calls
  });
}
