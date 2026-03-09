import { useLingui } from '@lingui/react/macro';
import { useDropzone } from 'react-dropzone';

interface DropZoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  children: React.ReactNode;
}

export const DropZone = ({ onDrop, children }: DropZoneProps) => {
  const { t } = useLingui();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/jpg': [],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps({
        role: 'button',
        'aria-label': t`Drop files here to upload`,
      })}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        isDragActive
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/60 bg-accent/25 hover:border-primary/30 hover:bg-accent/40'
      }`}
    >
      <input {...getInputProps()} />
      {children}
    </div>
  );
};
