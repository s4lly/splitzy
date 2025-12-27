/**
 * Downloads an image from various URL types (blob, data, or remote URL)
 * @param imageUrl - The URL of the image to download
 * @param fileName - Base filename for the downloaded file (default: 'receipt')
 */
export const downloadImage = async (
  imageUrl: string,
  fileName: string = 'receipt'
): Promise<void> => {
  try {
    let downloadUrl = imageUrl;
    let blob: Blob | undefined;

    // Handle different URL types
    if (imageUrl.startsWith('blob:')) {
      // Blob URL - fetch the blob
      const response = await fetch(imageUrl);
      blob = await response.blob();
      downloadUrl = URL.createObjectURL(blob);
    } else if (imageUrl.startsWith('data:')) {
      // Data URL - already good to go
      downloadUrl = imageUrl;
    } else if (imageUrl.startsWith('http')) {
      // Remote URL - fetch and convert to blob
      try {
        const response = await fetch(imageUrl);
        blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      } catch (error) {
        alert('Sorry, this image cannot be downloaded.');
        return;
      }
    } else {
      alert('Sorry, this image cannot be downloaded.');
      return;
    }

    // Create a file name from the base filename
    const sanitizedFileName = fileName
      .replace(/\s+/g, '_')
      .toLowerCase()
      .replace(/[/\\:]/g, '-');

    const link = document.createElement('a');
    link.download = `${sanitizedFileName}.jpg`;
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up any temporary object URL we created
    if (downloadUrl !== imageUrl && downloadUrl.startsWith('blob:')) {
      URL.revokeObjectURL(downloadUrl);
    }
  } catch (error) {
    alert('Failed to download the image. Please try again.');
  }
};

