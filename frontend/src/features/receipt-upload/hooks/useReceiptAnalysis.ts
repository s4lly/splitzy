import { useAuth } from '@clerk/clerk-react';
import { useMutation } from '@tanstack/react-query';

import type { ReceiptAnalysisResult } from '@/features/receipt-upload/types';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function useReceiptAnalysisMutation() {
  const { getToken, isSignedIn } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
    }: {
      file: File;
    }): Promise<ReceiptAnalysisResult> => {
      let token: string | null = null;
      if (isSignedIn) {
        try {
          token = await getToken();
        } catch (error) {
          console.error('[useReceiptAnalysis] Error retrieving token:', error);
        }
      }

      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(`${API_URL}/analyze-receipt`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let body: string;
        try {
          body = await response.text();
        } catch {
          body = '';
        }
        throw new Error(
          `Receipt analysis failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
        );
      }

      return response.json();
    },
    retry: false, // No retries for LLM calls
  });
}
