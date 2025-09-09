import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll use formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.originalFilename?.split('.').pop() || 'jpg';
    const filename = `receipt-${timestamp}.${fileExtension}`;

    // Read the binary data from the temporary file
    // Note: formidable saves the uploaded binary data to a temporary file
    // We read it into a buffer for blob storage upload
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to Vercel Blob Storage using the binary data
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: file.mimetype || 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Clean up temporary file created by formidable
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      // Log cleanup error but don't fail the request
      console.warn('Failed to clean up temporary file:', cleanupError);
    }

    return res.status(200).json({
      success: true,
      url: blob.url,
      filename: filename,
    });
  } catch (error) {
    console.error('Error uploading to blob storage:', error);
    return res.status(500).json({
      error: 'Failed to upload file to blob storage',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
