import { useCallback, useEffect, useState } from 'react';

interface UseFileDropzoneReturn {
  file: File | null;
  preview: string | null;
  onDrop: (acceptedFiles: File[]) => void;
  clearFile: () => void;
}

export const useFileDropzone = (): UseFileDropzoneReturn => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        // Revoke previous preview URL if it exists
        if (preview) {
          URL.revokeObjectURL(preview);
        }

        setFile(selectedFile);

        // Create a preview URL
        const previewUrl = URL.createObjectURL(selectedFile);
        setPreview(previewUrl);
      }
    },
    [preview]
  );

  const clearFile = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
  }, [preview]);

  // Cleanup effect to revoke blob URL when preview changes or component unmounts
  useEffect(() => {
    // Store the current preview URL to revoke on cleanup
    const currentPreview = preview;

    return () => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [preview]);

  return {
    file,
    preview,
    onDrop,
    clearFile,
  };
};

