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

    // Read the file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to Vercel Blob Storage
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: file.mimetype || 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      url: blob.url,
      filename: filename,
    });
  } catch (error) {
    console.error('Error uploading to blob storage:', error);
    return res.status(500).json({
      error: 'Failed to upload file to blob storage',
    });
  }
}
