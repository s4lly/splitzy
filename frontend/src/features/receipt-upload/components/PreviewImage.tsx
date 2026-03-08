import { AnimatePresence, motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';

interface PreviewImageProps {
  preview: string | null;
  onClear: () => void;
}

export const PreviewImage = ({ preview, onClear }: PreviewImageProps) => {
  return (
    <AnimatePresence>
      {preview ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative"
        >
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-h-[300px] rounded-lg"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-2 top-2 flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full bg-background/80 p-1 backdrop-blur-sm hover:bg-background"
            aria-label="Clear preview"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-2.5"
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Tap to upload a receipt
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              or drag & drop · JPEG, PNG
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
