import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Receipt } from '@/models/Receipt';
import { useAuth } from '@clerk/clerk-react';
import { animated, useSpring } from '@react-spring/web';
import { Download, Image as ImageIcon, Settings, Undo } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ImageSettingsDialog } from './components/ImageSettingsDialog';
import { useImageGestures } from './hooks/useImageGestures';
import { downloadImage } from './utils/downloadImage';
import { generateImageFileName } from './utils/generateImageFileName';

interface ReceiptImageViewerProps {
  receipt: Receipt;
}

export const ReceiptImageViewer = ({ receipt }: ReceiptImageViewerProps) => {
  const { ref, style, resetImage } = useImageGestures();
  const [imageError, setImageError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { userId } = useAuth();

  const imageUrl = receipt.imagePath;
  const fileName = generateImageFileName(receipt);
  const receiptId = receipt.id;
  const imageVisibility = receipt.imageVisibility;

  // Check if current user is the owner
  const isOwner =
    receipt.authUserId !== null &&
    receipt.authUserId !== undefined &&
    userId === receipt.authUserId;

  // Determine if image should be shown
  const shouldShowImage = imageVisibility !== 'owner_only' || isOwner;

  // Mount animation using react-spring
  const mountAnimation = useSpring({
    from: { opacity: 0, y: 10 },
    to: { opacity: 1, y: 0 },
    config: { duration: 300 },
  });

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    try {
      await downloadImage(imageUrl, fileName);
      toast.success('Image downloaded successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to download image';
      toast.error('Download failed', {
        description: message,
      });
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Reset error state when imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <animated.div style={mountAnimation}>
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <ImageIcon className="h-5 w-5 text-primary" />
            Receipt Image
          </CardTitle>
          <div className="flex items-center gap-2">
            {imageUrl && shouldShowImage && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleDownloadImage}
              >
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            )}
            {isOwner && receiptId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Image Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {imageUrl && shouldShowImage ? (
            <div className="relative overflow-hidden bg-muted/40">
              {imageError ? (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <svg
                    className="mb-4 h-16 w-16 text-muted-foreground/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-muted-foreground">
                    Failed to load receipt image
                  </p>
                </div>
              ) : (
                <animated.div
                  className="relative h-full w-full touch-none"
                  ref={ref}
                  style={style}
                >
                  <img
                    src={imageUrl}
                    alt="Receipt"
                    className="mx-auto max-h-[75vh] touch-none object-contain transition-transform duration-100"
                    onError={handleImageError}
                  />
                </animated.div>
              )}
              {!imageError && (
                <div className="absolute right-3 top-3 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full opacity-80 shadow-md hover:opacity-100"
                    onClick={resetImage}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : imageUrl && !shouldShowImage ? (
            <div className="flex flex-col items-center justify-center bg-muted/30 px-4 py-16 text-center">
              <ImageIcon className="mb-4 h-16 w-16 text-muted-foreground/40" />
              <p className="text-muted-foreground">Image hidden by owner</p>
              <p className="mt-2 text-sm text-muted-foreground/70">
                The receipt image is only visible to the owner
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-muted/30 px-4 py-16 text-center">
              <ImageIcon className="mb-4 h-16 w-16 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Receipt image not available
              </p>
              <p className="mt-2 text-sm text-muted-foreground/70">
                The original receipt image might not be stored or is no longer
                accessible
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {isOwner && receiptId && (
        <ImageSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          receiptId={receiptId}
          imageVisibility={imageVisibility}
        />
      )}
    </animated.div>
  );
};
