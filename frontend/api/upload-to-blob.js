import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll use formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate BLOB_READ_WRITE_TOKEN before attempting upload
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Blob storage configuration error', {
      error: 'BLOB_READ_WRITE_TOKEN environment variable is not configured',
      timestamp: new Date().toISOString(),
      operation: 'token_validation',
    });
    return res.status(500).json({
      error: 'Server configuration error: Blob storage token is not configured',
    });
  }

  let tempFilePath = null;

  try {
    // Parse the form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Store temp file path for cleanup
    tempFilePath = file.filepath;

    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.originalFilename?.split('.').pop() || 'jpg';
    const filename = `receipt-${timestamp}.${fileExtension}`;

    // Read the binary data from the temporary file using async API
    // Note: formidable saves the uploaded binary data to a temporary file
    // We read it into a buffer for blob storage upload
    const fileBuffer = await fs.readFile(file.filepath);

    // Upload to Vercel Blob Storage using the binary data
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: file.mimetype || 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
      filename: filename,
    });
  } catch (error) {
    console.error('Blob upload failed', {
      error: error.message,
      stack: error.stack,
      filename: filename || 'unknown',
      originalFilename: file?.originalFilename,
      mimetype: file?.mimetype,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      error: 'Failed to upload file to blob storage',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    // Clean up temporary file created by formidable
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        // Log cleanup error but don't mask the original error
        console.warn('Temporary file cleanup failed', {
          error: cleanupError.message,
          tempFilePath: tempFilePath,
          timestamp: new Date().toISOString(),
          operation: 'file_cleanup',
        });
      }
    }
  }
}
