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
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1 backdrop-blur-sm hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-2"
        >
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-base font-medium">
              Drag and drop your document here
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select a file
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
