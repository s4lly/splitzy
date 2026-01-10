import axios from 'axios';
import {
  ReceiptResponseSchema,
  UserReceiptsResponseSchema,
} from '../lib/receiptSchemas';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
        merchant: 'Whole Foods Market',
        date: '2023-06-15',
        total: 78.95,
        subtotal: 73.95,
        tax: 5.0,
        items: [
          {
            name: 'Organic Bananas',
            quantity: 1,
            unit_price: 3.99,
            price: 3.99,
          },
          {
            name: 'Cage-Free Eggs',
            quantity: 1,
            unit_price: 4.99,
            price: 4.99,
          },
          { name: 'Almond Milk', quantity: 2, unit_price: 3.49, price: 6.98 },
        ],
      },
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    },
    {
      id: 2,
      receipt_data: {
        merchant: 'Target',
        date: '2023-06-10',
        total: 124.56,
        subtotal: 115.3,
        tax: 9.26,
        items: [
          { name: 'T-Shirt', quantity: 2, unit_price: 19.99, price: 39.98 },
          {
            name: 'Cleaning Supplies',
            quantity: 1,
            unit_price: 12.99,
            price: 12.99,
          },
          { name: 'Snacks', quantity: 1, unit_price: 15.75, price: 15.75 },
        ],
      },
      created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago
    },
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
   * @param {Object} options - Optional configuration object
   * @param {string} options.token - Optional authentication token
   * @returns {Promise} - A promise that resolves to the analysis result
   */
  analyzeReceipt: async (imageFile: File, options?: { token?: string }) => {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      // Only include Authorization header when token is present
      // Let axios set the proper Content-Type with boundary for FormData
      const headers: Record<string, string> = options?.token
        ? { Authorization: `Bearer ${options.token}` }
        : {};

      const response = await axios.post(
        `${API_URL}/analyze-receipt`,
        formData,
        {
          headers,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      throw error;
    }
  },

  /**
   * Get the receipt history for the current user
   * @param {Object} options - Optional configuration object
   * @param {string} options.token - Optional authentication token
   * @returns {Promise} - A promise that resolves to the user's receipt history
   */
  getUserReceiptHistory: async (options?: { token?: string }) => {
    try {
      // Try to fetch from the server first
      try {
        // Only include Authorization header when token is present
        const headers: Record<string, string> = options?.token
          ? { Authorization: `Bearer ${options.token}` }
          : {};

        const response = await axios.get(`${API_URL}/user/receipts`, {
          headers,
        });

        // Zod validation
        const parsed = UserReceiptsResponseSchema.safeParse(response.data);

        if (!parsed.success) {
          console.error('Invalid receipt history response:', parsed.error);
          throw new Error('Invalid receipt history response from server');
        }

        return parsed.data;
      } catch (serverError) {
        // If it's a validation error, re-throw it
        if (
          serverError instanceof Error &&
          serverError.message.includes('Invalid')
        ) {
          throw serverError;
        }
        console.log('Server endpoint not available, using mock data');

        // If server endpoint is not available, return mock data
        // Note: Mock data should also be validated, but for now we'll return as-is
        return {
          success: true,
          receipts: getMockReceipts(),
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
        const response = await axios.delete(
          `${API_URL}/user/receipts/${receiptId}`
        );
        return response.data;
      } catch (serverError) {
        console.log('Server endpoint not available, using mock data');

        // If server endpoint is not available, delete from local storage
        const mockReceipts = getMockReceipts();
        const updatedReceipts = mockReceipts.filter(
          (receipt) => receipt.id !== receiptId
        );
        saveMockReceipts(updatedReceipts);

        return {
          success: true,
          message: 'Receipt deleted successfully',
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
        const response = await axios.get(
          `${API_URL}/user/receipts/${receiptId}`
        );
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
        const receipt = mockReceipts.find((r) => r.id === receiptId);

        if (!receipt) {
          throw new Error('Receipt not found');
        }

        return {
          success: true,
          receipt: receipt,
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
   * @deprecated - use image_path from receipt data instead
   */
  getReceiptImage: async (receiptId) => {
    try {
      // Try to get the image from the backend API
      const response = await axios.get(
        `${API_URL}/user/receipts/${receiptId}/image`
      );

      // Check if the response contains a blob URL
      if (response.data.success && response.data.image_url) {
        return response.data.image_url;
      }

      // Legacy handling for blob responses
      if (response.data instanceof Blob) {
        const imageUrl = URL.createObjectURL(response.data);
        return imageUrl;
      }

      return null;
    } catch (error) {
      // Check if this is a 404 error
      if (error.response && error.response.status === 404) {
        console.log(
          `Image endpoint not implemented on backend yet or no image for receipt ID ${receiptId}`
        );
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
   * @param {string} lineItemId - The ID of the line item to update
   * @param {string[]} assignments - The new assignments for the line item
   * @returns {Promise} - A promise that resolves to the updated receipt data
   */
  updateAssignments: async (receiptId, lineItemId, assignments) => {
    const response = await axios.put(
      `${API_URL}/user/receipts/${receiptId}/assignments`,
      { line_item_id: lineItemId, assignments: assignments }
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
      updateObj
    );
    return response.data;
  },

  /**
   * Delete a line item from a receipt
   * @param {number} receiptId - The ID of the receipt to update
   * @param {number} itemId - The ID of the line item to delete
   * @returns {Promise} - A promise that resolves when the line item is deleted
   */
  deleteLineItem: async (receiptId, itemId) => {
    const response = await axios.delete(
      `${API_URL}/user/receipts/${receiptId}/line-items/${itemId}`
    );
    return response.data;
  },

  /**
   * Add a new line item to a receipt
   * @param {number} receiptId - The ID of the receipt to update
   * @param {Object} lineItemData - The line item data to add
   * @returns {Promise} - A promise that resolves to the added line item
   */
  addLineItem: async (receiptId, lineItemData) => {
    const response = await axios.post(
      `${API_URL}/user/receipts/${receiptId}/line-items`,
      lineItemData
    );
    return response.data;
  },

  /**
   * Update receipt data properties
   * @param {number} receiptId - The ID of the receipt to update
   * @param {Object} updateObj - The object containing the updates to make
   * @returns {Promise} - A promise that resolves to the updated receipt data
   */
  updateReceiptData: async (receiptId, updateObj) => {
    const response = await axios.put(
      `${API_URL}/user/receipts/${receiptId}/receipt-data`,
      updateObj
    );
    return response.data;
  },
};

export default receiptService;
