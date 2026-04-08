import { Trans, useLingui } from '@lingui/react/macro';
import { useAtom, useSetAtom } from 'jotai';
import { ArrowLeft, Eye } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  pendingImageAtom,
  processedImageAtom,
} from '@/features/image-prep/atoms/imagePrepAtoms';
import {
  completedCropAtom,
  cropAtom,
  eraseRectsAtom,
  imageDimsAtom,
} from '@/features/image-prep/atoms/imagePrepStateAtoms';
import { CropTool } from '@/features/image-prep/components/CropTool';
import { EraseTool } from '@/features/image-prep/components/EraseTool';
import { processImage } from '@/features/image-prep/utils/canvasOperations';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const ImagePrepPage = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [pendingImage, setPendingImage] = useAtom(pendingImageAtom);
  const setProcessedImage = useSetAtom(processedImageAtom);

  useDocumentTitle(t`Prepare Image`);

  // Crop state (atoms so edits survive /preview → back navigation)
  const [crop, setCrop] = useAtom(cropAtom);
  const [completedCrop, setCompletedCrop] = useAtom(completedCropAtom);
  const [imageDims, setImageDims] = useAtom(imageDimsAtom);

  // Erase state
  const [eraseRects, setEraseRects] = useAtom(eraseRectsAtom);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    return function cleanup() {
      mountedRef.current = false;
    };
  }, []);

  // Guard: redirect to home on component mount when pendingImage is absent,
  // which happens when a user navigates directly to /prepare via URL.
  // The empty dependency array is intentional — this check should only run once
  // on mount, not re-run when pendingImage changes during the page lifecycle.
  useEffect(() => {
    if (!pendingImage) {
      navigate('/', { replace: true });
    }
  }, []);

  // Create a blob URL inside an effect so it is created and revoked in the same
  // effect pass. useMemo is not suitable here because StrictMode runs cleanup
  // then re-runs effects but useMemo returns the cached (now-revoked) URL.
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingImage) return;
    const url = URL.createObjectURL(pendingImage);
    setLocalPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setLocalPreview(null);
    };
  }, [pendingImage]);

  const handleBack = useCallback(() => {
    setPendingImage(null);
    setProcessedImage(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setImageDims(null);
    setEraseRects([]);
    navigate('/');
  }, [
    navigate,
    setPendingImage,
    setProcessedImage,
    setCrop,
    setCompletedCrop,
    setImageDims,
    setEraseRects,
  ]);

  const handlePreview = useCallback(async () => {
    if (!pendingImage || !localPreview) return;

    if (import.meta.env.DEV) {
      console.group('[ImagePrep] Processing');
      console.log('Image dims:', imageDims);
      console.log('Crop (display-px):', completedCrop);
      if (completedCrop && completedCrop.width > 0 && imageDims) {
        const scaleX = imageDims.naturalWidth / imageDims.displayWidth;
        const scaleY = imageDims.naturalHeight / imageDims.displayHeight;
        console.log('Crop (% of full image):', {
          x:
            ((completedCrop.x / imageDims.displayWidth) * 100).toFixed(1) + '%',
          y:
            ((completedCrop.y / imageDims.displayHeight) * 100).toFixed(1) +
            '%',
          w:
            ((completedCrop.width / imageDims.displayWidth) * 100).toFixed(1) +
            '%',
          h:
            ((completedCrop.height / imageDims.displayHeight) * 100).toFixed(
              1
            ) + '%',
        });
        console.log('Crop (natural-px):', {
          x: Math.round(completedCrop.x * scaleX),
          y: Math.round(completedCrop.y * scaleY),
          w: Math.round(completedCrop.width * scaleX),
          h: Math.round(completedCrop.height * scaleY),
        });
        if (eraseRects.length > 0) {
          console.log('Erase rects (% of full image):', eraseRects);
          const { remapEraseToCropRegion } =
            await import('@/features/image-prep/utils/canvasOperations');
          console.log(
            'Erase rects (remapped to crop region):',
            remapEraseToCropRegion(eraseRects, completedCrop, imageDims)
          );
        }
      } else {
        console.log('Erase rects (% of full image):', eraseRects);
      }
      console.groupEnd();
    }

    setIsProcessing(true);
    setProcessingError(null);
    try {
      const processed = await processImage(
        pendingImage,
        localPreview,
        completedCrop && completedCrop.width > 0 ? completedCrop : null,
        eraseRects,
        imageDims ?? undefined
      );
      if (!mountedRef.current) return;
      setProcessedImage(processed);
      navigate('/preview');
    } catch (err) {
      console.error('Image processing failed:', err);
      if (!mountedRef.current) return;
      setProcessingError(t`Image processing failed`);
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [
    completedCrop,
    eraseRects,
    imageDims,
    localPreview,
    navigate,
    pendingImage,
    setProcessedImage,
  ]);

  if (!pendingImage || !localPreview) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label={t`Back`}
          className="-ml-2 shrink-0"
          disabled={isProcessing}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight text-foreground">
            <Trans>Prepare image</Trans>
          </h1>
          <p className="text-xs text-muted-foreground">
            <Trans>Crop or erase areas before analyzing</Trans>
          </p>
        </div>
      </div>

      {/* Tools */}
      <Tabs defaultValue="crop">
        <TabsList className="w-full">
          <TabsTrigger value="crop" className="flex-1">
            <Trans>Crop</Trans>
            {completedCrop &&
              completedCrop.width > 0 &&
              completedCrop.height > 0 && (
                <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold leading-none text-white">
                  +
                </span>
              )}
          </TabsTrigger>
          <TabsTrigger value="erase" className="flex-1">
            <Trans>Erase areas</Trans>
            {eraseRects.length > 0 && (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold leading-none text-white">
                +
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crop" className="mt-3">
          <CropTool
            preview={localPreview}
            crop={crop}
            onCropChange={setCrop}
            onCropComplete={(pixelCrop, dims) => {
              setCompletedCrop(pixelCrop);
              setImageDims(dims);
            }}
          />
        </TabsContent>

        <TabsContent value="erase" className="mt-3">
          <EraseTool
            preview={localPreview}
            rects={eraseRects}
            onChange={setEraseRects}
          />
        </TabsContent>
      </Tabs>

      {processingError && (
        <p className="text-sm text-destructive" role="alert">
          {processingError}
        </p>
      )}

      {/* Preview button */}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={handlePreview}
        disabled={isProcessing}
      >
        <Eye data-icon="inline-start" />
        <Trans>Preview result</Trans>
      </Button>
    </div>
  );
};

export default ImagePrepPage;
