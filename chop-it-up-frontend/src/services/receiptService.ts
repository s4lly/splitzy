import axios from 'axios';
import { ReceiptResponseSchema } from '../lib/receiptSchemas';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Local storage key for mock receipt history
const MOCK_RECEIPTS_KEY = 'mock_receipt_history';

// Helper to get mock receipts from localStorage
const getMockReceipts = () => {
  const storedReceipts = localStorage.getItem(MOCK_RECEIPTS_KEY);
  if (storedReceipts) {
    return JSON.parse(storedReceipts);
  }
  return [
    {
      id: 1,
      receipt_data: {
        merchant: "Whole Foods Market",
        date: "2023-06-15",
        total: 78.95,
        subtotal: 73.95,
        tax: 5.00,
        items: [
          { name: "Organic Bananas", quantity: 1, unit_price: 3.99, price: 3.99 },
          { name: "Cage-Free Eggs", quantity: 1, unit_price: 4.99, price: 4.99 },
          { name: "Almond Milk", quantity: 2, unit_price: 3.49, price: 6.98 }
        ]
      },
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    },
    {
      id: 2,
      receipt_data: {
        merchant: "Target",
        date: "2023-06-10",
        total: 124.56,
        subtotal: 115.30,
        tax: 9.26,
        items: [
          { name: "T-Shirt", quantity: 2, unit_price: 19.99, price: 39.98 },
          { name: "Cleaning Supplies", quantity: 1, unit_price: 12.99, price: 12.99 },
          { name: "Snacks", quantity: 1, unit_price: 15.75, price: 15.75 }
        ]
      },
      created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() // 9 days ago
    }
  ];
};

// Helper to save mock receipts to localStorage
const saveMockReceipts = (receipts) => {
  localStorage.setItem(MOCK_RECEIPTS_KEY, JSON.stringify(receipts));
};

/**
 * Service for interacting with the document analysis API
 */
const receiptService = {
  /**
   * Upload and analyze a receipt, invoice, or other payment document
   * @param {File} imageFile - The document image file
   * @param {string} previewUrl - Optional URL of the image preview
   * @param {string} provider - The AI provider to use ('azure' or 'gemini')
   * @returns {Promise} - A promise that resolves to the analysis result
   */
  analyzeReceipt: async (imageFile, previewUrl = null, provider = 'azure') => {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('provider', provider);
      
      const response = await axios.post(`${API_URL}/analyze-receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      
      // If the API is available but doesn't save receipts yet,
      // store the result in localStorage for our mock implementation
      try {
        const result = response.data.result;
        // Add id and created_at if they don't exist (for mock implementation)
        if (result && !result.id) {
          const mockReceipts = getMockReceipts();
          const newId = mockReceipts.length > 0 ? Math.max(...mockReceipts.map(r => r.id)) + 1 : 1;
          
          // Make sure we have a Base64 version of the image for persistent storage
          let imageDataUrl = previewUrl;
          if (previewUrl && !previewUrl.startsWith('data:')) {
            try {
              // Convert blob URL to Base64 for storage
              const response = await fetch(previewUrl);
              const blob = await response.blob();
              
              const reader = new FileReader();
              imageDataUrl = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              
              // Validate data URL to ensure it's valid
              if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:')) {
                console.warn('Generated image data URL appears invalid, ignoring it');
                imageDataUrl = null;
              }
            } catch (e) {
              console.error('Failed to convert preview URL to Data URL:', e);
              imageDataUrl = null;
            }
          }
          
          const newReceipt = {
            id: newId,
            receipt_data: result,
            created_at: new Date().toISOString(),
            image_url: imageDataUrl // Store the image URL for later retrieval
          };
          
          mockReceipts.unshift(newReceipt); // Add to beginning of array
          saveMockReceipts(mockReceipts);
          
          // Include the ID and image URL in the response for navigation and display
          response.data.receipt_data = { 
            ...response.data.result, 
            id: newId 
          };
          response.data.image_url = imageDataUrl;
        }
      } catch (e) {
        console.error('Error saving receipt to mock storage:', e);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      throw error;
    }
  },
  
  /**
   * Get the receipt history for the current user
   * @returns {Promise} - A promise that resolves to the user's receipt history
   */
  getUserReceiptHistory: async () => {
    try {
      // Try to fetch from the server first
      try {
        const response = await axios.get(`${API_URL}/user/receipts`, {
          withCredentials: true,
        });
        return response.data;
      } catch (serverError) {
        console.log('Server endpoint not available, using mock data');
        
        // If server endpoint is not available, return mock data
        return {
          success: true,
          receipts: getMockReceipts()
        };
      }
    } catch (error) {
      console.error('Error fetching receipt history:', error);
      throw error;
    }
  },
  
  /**
   * Delete a receipt by ID
   * @param {number} receiptId - The ID of the receipt to delete
   * @returns {Promise} - A promise that resolves when the receipt is deleted
   */
  deleteReceipt: async (receiptId) => {
    try {
      // Try server endpoint first
      try {
        const response = await axios.delete(`${API_URL}/user/receipts/${receiptId}`, {
          withCredentials: true,
        });
        return response.data;
      } catch (serverError) {
        console.log('Server endpoint not available, using mock data');
        
        // If server endpoint is not available, delete from local storage
        const mockReceipts = getMockReceipts();
        const updatedReceipts = mockReceipts.filter(receipt => receipt.id !== receiptId);
        saveMockReceipts(updatedReceipts);
        
        return {
          success: true,
          message: 'Receipt deleted successfully'
        };
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific receipt by ID
   * @param {number} receiptId - The ID of the receipt to fetch
   * @returns {Promise} - A promise that resolves to the receipt data
   */
  getSingleReceipt: async (receiptId) => {
    try {
      // Try server endpoint first
      try {
        const response = await axios.get(`${API_URL}/user/receipts/${receiptId}`, {
          withCredentials: true,
        });
        // Zod validation
        const parsed = ReceiptResponseSchema.safeParse(response.data);
        if (!parsed.success) {
          console.error('Invalid receipt response:', parsed.error);
          throw new Error('Invalid receipt response from server');
        }
        return parsed.data;
      } catch (serverError) {
        console.log('Server endpoint not available, using mock data');
        
        // If server endpoint is not available, get from local storage
        const mockReceipts = getMockReceipts();
        const receipt = mockReceipts.find(r => r.id === receiptId);
        
        if (!receipt) {
          throw new Error('Receipt not found');
        }
        
        return {
          success: true,
          receipt: receipt
        };
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      throw error;
    }
  },
  
  /**
   * Get receipt image from the backend
   * @param {number} receiptId - The ID of the receipt to fetch the image for
   * @returns {Promise<string|null>} - A promise that resolves to the image URL or null if not found
   */
  getReceiptImage: async (receiptId) => {
    try {
      // Try to get the image from the backend API
      const response = await axios.get(`${API_URL}/user/receipts/${receiptId}/image`, {
        withCredentials: true,
        responseType: 'blob' // Get the response as a blob
      });
      
      // Create a URL for the blob
      const imageBlob = response.data;
      const imageUrl = URL.createObjectURL(imageBlob);
      return imageUrl;
    } catch (error) {
      // Check if this is a 404 error
      if (error.response && error.response.status === 404) {
        console.log(`Image endpoint not implemented on backend yet or no image for receipt ID ${receiptId}`);
      } else {
        console.error('Error fetching image from backend:', error);
      }
      return null;
    }
  },
  
  /**
   * Check if the API is healthy
   * @returns {Promise<boolean>} - A promise that resolves to true if the API is healthy
   */
  checkHealth: async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  },
  
  /**
   * Update the assignments for a receipt
   * @param {number} receiptId - The ID of the receipt to update
   * @param {Object[]} lineItems - The line items to update
   * @returns {Promise} - A promise that resolves to the updated receipt data
   */
  updateAssignments: async (receiptId, lineItems) => {
    const response = await axios.put(
      `${API_URL}/user/receipts/${receiptId}/assignments`,
      { line_items: lineItems },
      { withCredentials: true }
    );
    return response.data;
  },

  /**
   * Update a line item in a receipt
   * @param {number} receiptId - The ID of the receipt to update
   * @param {number} itemId - The ID of the line item to update
   * @param {Object} updateObj - The object containing the updates to make
   * @returns {Promise} - A promise that resolves to the updated receipt data
   */
  updateLineItem: async (receiptId, itemId, updateObj) => {
    const response = await axios.put(
      `${API_URL}/user/receipts/${receiptId}/line-items/${itemId}`,
      updateObj,
      { withCredentials: true }
    );
    return response.data;
  }
};

export default receiptService; 