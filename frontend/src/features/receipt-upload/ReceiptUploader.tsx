import { Trans } from '@lingui/react/macro';
import type { UseMutationResult } from '@tanstack/react-query';
import { FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropZone } from '@/features/receipt-upload/components/DropZone';
import { ErrorMessage } from '@/features/receipt-upload/components/ErrorMessage';
import { PreviewImage } from '@/features/receipt-upload/components/PreviewImage';
import { useFileDropzone } from '@/features/receipt-upload/hooks/useFileDropzone';
import { useReceiptAnalysisMutation } from '@/features/receipt-upload/hooks/useReceiptAnalysis';
import type {
  ReceiptAnalysisResult,
  ReceiptUploaderProps,
} from '@/features/receipt-upload/types';

/**
 * Parses the error state from the receipt analysis mutation and returns
 * a human-readable error message.
 *
 * The mutation can be in several states:
 * 1. Network/API error: mutation.error is set (network failure, 500 error, etc.)
 * 2. Analysis failed: mutation.data exists but success is false (backend rejected the request)
 * 3. Not a receipt: mutation.data exists, success is true, but is_receipt is false (LLM determined it's not a receipt)
 * 4. Success: mutation.data exists, success is true, and is_receipt is true (no error)
 * 5. No data yet: mutation hasn't been called or is still pending (no error)
 *
 * @param mutation - The TanStack Query mutation result from useReceiptAnalysisMutation
 * @returns A user-friendly error message string, or null if there's no error
 */
function parseReceiptAnalysisError(
  mutation: UseMutationResult<
    ReceiptAnalysisResult,
    Error,
    { file: File },
    unknown
  >
): string | null {
  if (mutation.error) {
    return 'An error occurred while analyzing the document. Please try again.';
  }

  if (mutation.data && !mutation.data.success) {
    return mutation.data.error || 'Failed to analyze document';
  }

  if (mutation.data && mutation.data.success && !mutation.data.is_receipt) {
    return 'The uploaded image does not appear to be a payment document (receipt, invoice, bill, etc.). Please upload an image that contains items, prices, and totals.';
  }

  return null;
}

export const ReceiptUploader = ({
  onAnalysisComplete,
}: ReceiptUploaderProps) => {
  const { file, preview, onDrop, clearFile } = useFileDropzone();
  const mutation = useReceiptAnalysisMutation();

  // Parse the error message from the mutation state
  // This function handles all possible error states and returns a user-friendly message
  const error = parseReceiptAnalysisError(mutation);

  const handleSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!file) return;

    mutation.mutate(
      { file },
      {
        onSuccess: (result) => {
          if (result.success && result.is_receipt) {
            // Revoke blob URL and clear state immediately before navigation
            clearFile();
            // Call the onAnalysisComplete callback with the result
            // This will navigate away, so we clear state first
            if (onAnalysisComplete) {
              onAnalysisComplete(result);
            }
          }
        },
      }
    );
  };

  return (
    <Card className="mx-auto w-full border-0 shadow-[0_2px_16px_0_rgba(0,0,0,0.07)]">
      <CardContent className="px-4 pb-4 pt-4">
        <div className="flex flex-col gap-3">
          <DropZone onDrop={onDrop}>
            <PreviewImage preview={preview} onClear={clearFile} />
          </DropZone>

          <ErrorMessage error={error} />

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!file || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                <Trans>Analyzing…</Trans>
              </>
            ) : (
              <>
                <FileText data-icon="inline-start" />
                <Trans>Analyze Document</Trans>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
