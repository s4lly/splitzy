import 'react-image-crop/dist/ReactCrop.css';

import { Trans } from '@lingui/react/macro';
import { RotateCcw } from 'lucide-react';
import { useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';

import { Button } from '@/components/ui/button';
import type { ImageDimensions } from '@/features/image-prep/utils/canvasOperations';

interface Props {
  preview: string;
  crop: Crop | undefined;
  onCropChange: (crop: Crop) => void;
  onCropComplete: (crop: PixelCrop, dims: ImageDimensions) => void;
}

export function CropTool({
  preview,
  crop,
  onCropChange,
  onCropComplete,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleCropComplete = useCallback(
    (pixelCrop: PixelCrop) => {
      const img = imgRef.current;
      if (!img) return;
      onCropComplete(pixelCrop, {
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    },
    [onCropComplete]
  );

  const handleReset = useCallback(() => {
    // Passing an empty-ish crop clears the selection
    onCropChange({ unit: '%', x: 0, y: 0, width: 0, height: 0 });
    const img = imgRef.current;
    onCropComplete(
      { unit: 'px', x: 0, y: 0, width: 0, height: 0 },
      {
        displayWidth: img?.clientWidth ?? 0,
        displayHeight: img?.clientHeight ?? 0,
        naturalWidth: img?.naturalWidth ?? 0,
        naturalHeight: img?.naturalHeight ?? 0,
      }
    );
  }, [onCropChange, onCropComplete]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        <Trans>
          Drag to select the area you want to keep. Crop out anything that isn't
          part of the receipt to improve accuracy.
        </Trans>
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <ReactCrop
          crop={crop}
          onChange={onCropChange}
          onComplete={handleCropComplete}
          className="w-full"
        >
          <img
            ref={imgRef}
            src={preview}
            alt="Receipt"
            className="block w-full object-contain"
          />
        </ReactCrop>
      </div>

      {crop && crop.width > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
          onClick={handleReset}
        >
          <RotateCcw className="mr-1 size-4" />
          <Trans>Reset crop</Trans>
        </Button>
      )}
    </div>
  );
}
