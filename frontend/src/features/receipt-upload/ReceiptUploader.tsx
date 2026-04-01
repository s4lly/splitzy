import { Trans } from '@lingui/react/macro';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropZone } from '@/features/receipt-upload/components/DropZone';
import { PreviewImage } from '@/features/receipt-upload/components/PreviewImage';
import { useFileDropzone } from '@/features/receipt-upload/hooks/useFileDropzone';
import type { ReceiptUploaderProps } from '@/features/receipt-upload/types';

export const ReceiptUploader = ({ onContinue }: ReceiptUploaderProps) => {
  const { file, preview, onDrop, clearFile } = useFileDropzone();

  const handleContinue = () => {
    if (!file) return;
    onContinue?.(file);
  };

  return (
    <Card className="mx-auto w-full border-0 shadow-[0_2px_16px_0_rgba(0,0,0,0.07)]">
      <CardContent className="px-4 pb-4 pt-4">
        <div className="flex flex-col gap-3">
          <DropZone onDrop={onDrop}>
            <PreviewImage preview={preview} onClear={clearFile} />
          </DropZone>

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleContinue}
            disabled={!file}
          >
            <Trans>Continue</Trans>
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
