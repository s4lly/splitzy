import { Trans } from '@lingui/react/macro';
import { useAtom, useSetAtom } from 'jotai';
import { ArrowLeft, FileSearch, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  completedCropAtom,
  cropAtom,
  eraseRectsAtom,
  imageDimsAtom,
} from '@/features/image-prep/atoms/imagePrepStateAtoms';
import {
  pendingImageAtom,
  processedImageAtom,
} from '@/features/image-prep/atoms/pendingImageAtom';
import { useReceiptAnalysisMutation } from '@/features/receipt-upload/hooks/useReceiptAnalysis';
import type { ReceiptAnalysisResult } from '@/features/receipt-upload/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function parseError(
  mutation: ReturnType<typeof useReceiptAnalysisMutation>
): string | null {
  if (mutation.error) {
    return 'An error occurred while analyzing the document. Please try again.';
  }
  if (mutation.data && !mutation.data.success) {
    return mutation.data.error || 'Failed to analyze document';
  }
  if (mutation.data && mutation.data.success && !mutation.data.is_receipt) {
    const reason = mutation.data.receipt_data?.reason as string | undefined;
    return reason
      ? `The image does not appear to be a receipt: ${reason}`
      : 'The uploaded image does not appear to be a payment document. Please upload a receipt, invoice, or bill.';
  }
  return null;
}

const PreviewPage = () => {
  const navigate = useNavigate();
  const [processedImage, setProcessedImage] = useAtom(processedImageAtom);
  const setPendingImage = useSetAtom(pendingImageAtom);
  const setCrop = useSetAtom(cropAtom);
  const setCompletedCrop = useSetAtom(completedCropAtom);
  const setImageDims = useSetAtom(imageDimsAtom);
  const setEraseRects = useSetAtom(eraseRectsAtom);
  const mutation = useReceiptAnalysisMutation();

  useDocumentTitle('Preview');

  // Guard: redirect on mount only if no processed image (handles direct URL access)
  useEffect(() => {
    if (!processedImage) {
      navigate('/prepare', { replace: true });
    }
  }, []);

  const [localPreview, setLocalPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!processedImage) return;
    const url = URL.createObjectURL(processedImage);
    setLocalPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setLocalPreview(null);
    };
  }, [processedImage]);

  const handleBack = useCallback(() => {
    setProcessedImage(null);
    navigate('/prepare');
  }, [navigate, setProcessedImage]);

  const handleAnalyze = useCallback(() => {
    if (!processedImage) return;

    mutation.mutate(
      { file: processedImage },
      {
        onSuccess: (result: ReceiptAnalysisResult) => {
          if (result.success && result.is_receipt && result.receipt_data?.id) {
            setProcessedImage(null);
            setPendingImage(null);
            setCrop(undefined);
            setCompletedCrop(null);
            setImageDims(null);
            setEraseRects([]);
            navigate(`/receipt/${result.receipt_data.id}`);
          }
        },
      }
    );
  }, [
    mutation,
    navigate,
    processedImage,
    setCrop,
    setCompletedCrop,
    setImageDims,
    setEraseRects,
    setPendingImage,
    setProcessedImage,
  ]);

  if (!processedImage || !localPreview) return null;

  const error = parseError(mutation);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Back to prepare"
          className="-ml-2 shrink-0"
          disabled={mutation.isPending}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight text-foreground">
            <Trans>Preview result</Trans>
          </h1>
          <p className="text-xs text-muted-foreground">
            <Trans>Verify edits look correct before analyzing</Trans>
          </p>
        </div>
      </div>

      {/* Processed image */}
      <div className="overflow-hidden rounded-lg border border-border">
        <img
          src={localPreview}
          alt="Processed receipt"
          className="block w-full object-contain"
        />
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Analyze button */}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={handleAnalyze}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <Loader2 data-icon="inline-start" className="animate-spin" />
            <Trans>Analyzing…</Trans>
          </>
        ) : (
          <>
            <FileSearch data-icon="inline-start" />
            <Trans>Analyze receipt</Trans>
          </>
        )}
      </Button>
    </div>
  );
};

export default PreviewPage;
