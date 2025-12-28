/**
 * MIME type to file extension mapping for common image formats
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

/**
 * Gets the file extension for a given MIME type
 * @param mimeType - The MIME type string (e.g., 'image/png')
 * @returns The file extension without the dot (e.g., 'png'), defaults to 'jpg' if unknown
 */
export const getExtensionFromMimeType = (mimeType: string): string => {
  return MIME_TO_EXTENSION[mimeType.toLowerCase().trim()] || 'jpg';
};

/**
 * Extracts the MIME type from a data URL
 * @param dataUrl - The data URL string (e.g., 'data:image/png;base64,...')
 * @returns The MIME type string or null if not found
 */
export const getMimeTypeFromDataUrl = (dataUrl: string): string | null => {
  const match = dataUrl.match(/^data:(image\/[^;]+);/);
  return match ? match[1] : null;
};
