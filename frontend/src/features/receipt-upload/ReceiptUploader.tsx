import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { UseMutationResult } from '@tanstack/react-query';
import { FileText, Loader2 } from 'lucide-react';
import { DropZone } from './components/DropZone';
import { ErrorMessage } from './components/ErrorMessage';
import { PreviewImage } from './components/PreviewImage';
import { useFileDropzone } from './hooks/useFileDropzone';
import { useReceiptAnalysisMutation } from './hooks/useReceiptAnalysis';
import type { ReceiptAnalysisResult, ReceiptUploaderProps } from './types';

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
    { file: File; preview: string | null },
    unknown
  >
): string | null {
  // State 1: Network or API-level error occurred
  // This happens when the request fails at the network level (no connection,
  // server down, timeout, etc.) or when the API returns a non-2xx status.
  // TanStack Query sets mutation.error in these cases.
  // We show a generic error because network errors don't provide specific
  // feedback about what went wrong with the document itself.
  if (mutation.error) {
    return 'An error occurred while analyzing the document. Please try again.';
  }

  // State 2: Request succeeded but analysis failed
  // The backend received the request and processed it, but the analysis
  // was unsuccessful. This could happen if the file format is invalid,
  // the image is corrupted, or the backend encountered an internal error
  // during processing. The backend returns success: false with an error message.
  // We prefer the backend's error message if available, otherwise use a generic one.
  if (mutation.data && !mutation.data.success) {
    return mutation.data.error || 'Failed to analyze document';
  }

  // State 3: Analysis succeeded but document is not a receipt
  // The LLM successfully analyzed the image but determined it's not a
  // payment document (receipt, invoice, bill, etc.). This is a validation
  // error - the user uploaded something that doesn't match what we're looking for.
  // We provide a helpful message explaining what we're looking for so the user
  // can upload a more appropriate document.
  if (mutation.data && mutation.data.success && !mutation.data.is_receipt) {
    return 'The uploaded image does not appear to be a payment document (receipt, invoice, bill, etc.). Please upload an image that contains items, prices, and totals.';
  }

  // State 4 & 5: Success or no data yet
  // Either the analysis succeeded and it's a valid receipt (State 4),
  // or the mutation hasn't been called yet or is still pending (State 5).
  // In both cases, there's no error to display.
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
      { file, preview },
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
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <DropZone onDrop={onDrop}>
            <PreviewImage preview={preview} onClear={clearFile} />
          </DropZone>

          <ErrorMessage error={error} />
        </div>
      </CardContent>

      <CardFooter className="border-t border-border bg-muted/20 py-4">
        <Button
          className="w-full py-6 text-base font-medium"
          size="lg"
          onClick={handleSubmit}
          disabled={!file || mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Analyze Document
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
