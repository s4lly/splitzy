// BACKEND IMPLEMENTATION GUIDE
// This file provides an example of how to implement the required endpoints in your backend

// ----------------
// Database Schema
// ----------------
/*
Add a new table/collection for storing user receipts:

CREATE TABLE user_receipts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  receipt_data JSONB NOT NULL,
  image_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// ----------------
// Express API Routes
// ----------------

// Add these routes to your Express app

/**
 * Store receipt analysis result
 * This should be added to your existing receipt analysis endpoint
 */
app.post('/api/analyze-receipt', upload.single('file'), async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    // Your existing code to analyze the receipt using OCR/AI
    const analysisResult = await analyzeReceiptImage(imageFile.path);
    
    // Store the analysis result in the database linked to the current user
    const receiptEntry = await db.query(
      'INSERT INTO user_receipts (user_id, receipt_data, image_path) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, JSON.stringify(analysisResult), imageFile.path]
    );
    
    // Add the ID to the result
    analysisResult.id = receiptEntry.rows[0].id;
    analysisResult.created_at = new Date().toISOString();
    
    return res.json({
      success: true,
      result: analysisResult
    });
  } catch (error) {
    console.error('Receipt analysis error:', error);
    return res.status(500).json({ success: false, error: 'Failed to analyze receipt' });
  }
});

/**
 * Get user's receipt history
 */
app.get('/api/user/receipts', async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    // Fetch receipts for the current user, ordered by most recent first
    const receiptsResult = await db.query(
      'SELECT id, receipt_data, image_path, created_at FROM user_receipts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    // Format the receipts for the response
    const receipts = receiptsResult.rows.map(row => ({
      id: row.id,
      receipt_data: typeof row.receipt_data === 'string' ? JSON.parse(row.receipt_data) : row.receipt_data,
      image_path: row.image_path,
      created_at: row.created_at
    }));
    
    return res.json({
      success: true,
      receipts: receipts
    });
  } catch (error) {
    console.error('Error fetching receipt history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch receipt history' });
  }
});

/**
 * Get a specific receipt by ID
 */
app.get('/api/user/receipts/:id', async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const receiptId = req.params.id;
    
    // Fetch the specific receipt, ensuring it belongs to the current user
    const receiptResult = await db.query(
      'SELECT id, receipt_data, image_path, created_at FROM user_receipts WHERE id = $1 AND user_id = $2',
      [receiptId, req.user.id]
    );
    
    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }
    
    const receipt = receiptResult.rows[0];
    
    return res.json({
      success: true,
      receipt: {
        id: receipt.id,
        receipt_data: typeof receipt.receipt_data === 'string' ? JSON.parse(receipt.receipt_data) : receipt.receipt_data,
        image_path: receipt.image_path,
        created_at: receipt.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch receipt' });
  }
});

// ----------------
// Authentication Middleware
// ----------------

// Make sure you have authentication middleware to identify the current user
function authMiddleware(req, res, next) {
  // Example using session-based auth
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  // Set the user on the request object
  req.user = { id: req.session.userId };
  next();
}

// Apply to protected routes
app.use('/api/analyze-receipt', authMiddleware);
app.use('/api/user/receipts', authMiddleware); 