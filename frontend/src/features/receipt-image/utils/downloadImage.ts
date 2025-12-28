import {
  getExtensionFromMimeType,
  getMimeTypeFromDataUrl,
} from './imageFormat';

/**
 * Downloads an image from various URL types (blob, data, or remote URL)
 * @param imageUrl - The URL of the image to download
 * @param fileName - Base filename for the downloaded file (default: 'receipt')
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @throws Error with descriptive message for network/timeout/CORS errors
 */
export const downloadImage = async (
  imageUrl: string,
  fileName: string = 'receipt',
  timeout: number = 30000
): Promise<void> => {
  let downloadUrl = imageUrl;
  let blob: Blob | undefined;
  let objectUrlCreated = false;
  let mimeType: string | null = null;

  try {
    // Handle different URL types
    if (imageUrl.startsWith('blob:')) {
      // Blob URL - fetch the blob
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }

        blob = await response.blob();
        mimeType = blob.type;
        downloadUrl = URL.createObjectURL(blob);
        objectUrlCreated = true;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Image download timed out. Please try again.');
          }
          if (
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ) {
            throw new Error(
              'Network error: Unable to download image. Please check your connection or try again later.'
            );
          }
          throw error;
        }
        throw new Error('Failed to download image.');
      }
    } else if (imageUrl.startsWith('data:')) {
      // Data URL - already good to go
      downloadUrl = imageUrl;
      mimeType = getMimeTypeFromDataUrl(imageUrl);
    } else if (imageUrl.startsWith('http')) {
      // Remote URL - fetch and convert to blob
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }

        blob = await response.blob();
        mimeType = blob.type;
        downloadUrl = URL.createObjectURL(blob);
        objectUrlCreated = true;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Image download timed out. Please try again.');
          }
          if (
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ) {
            throw new Error(
              'Network error: Unable to download image. The server may not allow cross-origin downloads or there may be a connection issue.'
            );
          }
          throw error;
        }
        throw new Error('Failed to download image.');
      }
    } else {
      throw new Error('Invalid image URL format. Cannot download image.');
    }

    // Create a file name from the base filename
    const sanitizedFileName = fileName
      .replace(/\s+/g, '_')
      .toLowerCase()
      .replace(/[/\\:]/g, '-');

    const extension = getExtensionFromMimeType(mimeType || '');
    const link = document.createElement('a');
    link.download = `${sanitizedFileName}.${extension}`;
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up any temporary object URL we created
    if (objectUrlCreated) {
      URL.revokeObjectURL(downloadUrl);
    }
  } catch (error) {
    // Clean up object URL if it was created before error
    if (objectUrlCreated) {
      URL.revokeObjectURL(downloadUrl);
    }

    // Re-throw with a user-friendly message if it's not already an Error with message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to download the image. Please try again.');
  }
};
