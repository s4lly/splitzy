import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { DropZone } from './components/DropZone';
import { ErrorMessage } from './components/ErrorMessage';
import { PreviewImage } from './components/PreviewImage';
import { useReceiptUpload } from './hooks/useReceiptUpload';
import type { ReceiptUploaderProps } from './types';

export const ReceiptUploader = ({
  onAnalysisComplete,
}: ReceiptUploaderProps) => {
  const {
    file,
    preview,
    isUploading,
    error,
    onDrop,
    handleSubmit,
    clearFile,
  } = useReceiptUpload(onAnalysisComplete);

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
          disabled={!file || isUploading}
        >
          {isUploading ? (
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

