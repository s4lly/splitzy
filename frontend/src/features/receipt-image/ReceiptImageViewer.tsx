import { animated } from '@react-spring/web';
import { motion } from 'framer-motion';
import { Download, Image as ImageIcon, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useImageGestures } from './hooks/useImageGestures';
import { downloadImage } from './utils/downloadImage';

interface ReceiptImageViewerProps {
  imageUrl: string | null;
  fileName?: string;
}

export const ReceiptImageViewer = ({
  imageUrl,
  fileName = 'receipt',
}: ReceiptImageViewerProps) => {
  const { ref, style, resetImage } = useImageGestures();

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    await downloadImage(imageUrl, fileName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <ImageIcon className="h-5 w-5 text-primary" />
            Receipt Image
          </CardTitle>
          {imageUrl && (
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
        </CardHeader>
        <CardContent className="p-0">
          {imageUrl ? (
            <div className={`relative overflow-hidden bg-muted/40`}>
              <animated.div
                className="relative h-full w-full touch-none"
                ref={ref}
                style={style}
              >
                <img
                  src={imageUrl}
                  alt="Receipt"
                  className={`mx-auto max-h-[75vh] touch-none object-contain transition-transform duration-100`}
                  onError={(e) => {
                    // Don't try to load another image, just hide this one and show fallback
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';

                    // Find closest parent that would be good for appending fallback
                    const container = target.closest('.relative');
                    if (container) {
                      // Check if fallback already exists to prevent infinite loop
                      if (!container.querySelector('.receipt-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className =
                          'flex flex-col items-center justify-center py-16 px-4 text-center receipt-fallback';
                        fallback.innerHTML = `
                          <svg class="h-16 w-16 text-muted-foreground/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-muted-foreground">Failed to load receipt image</p>
                        `;
                        container.appendChild(fallback);
                      }
                    }
                  }}
                />
              </animated.div>
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
    </motion.div>
  );
};

