import axios from 'axios';

import {
  type LineItem,
  type LineItemPayload,
  ReceiptResponseSchema,
  type UpdateLineItemPayload,
  UpdateLineItemPayloadSchema,
  type UpdateReceiptPayload,
  UpdateReceiptPayloadSchema,
  UserReceiptsResponseSchema,
} from '@/lib/receiptSchemas';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
      const headers: Record<string, string> = options?.token
        ? { Authorization: `Bearer ${options.token}` }
        : {};
      const response = await axios.get(`${API_URL}/user/receipts`, {
        headers,
      });
      const parsed = UserReceiptsResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        console.error('Invalid receipt history response:', parsed.error);
        throw new Error('Invalid receipt history response from server');
      }
      return parsed.data;
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
  deleteReceipt: async (receiptId: number | string) => {
    try {
      const response = await axios.delete(
        `${API_URL}/user/receipts/${Number(receiptId)}`
      );
      return response.data;
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
  getSingleReceipt: async (receiptId: number | string) => {
    try {
      const response = await axios.get(
        `${API_URL}/user/receipts/${Number(receiptId)}`
      );
      const parsed = ReceiptResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        console.error('Invalid receipt response:', parsed.error);
        throw new Error('Invalid receipt response from server');
      }
      return parsed.data;
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
  getReceiptImage: async (receiptId: number | string) => {
    try {
      // Try to get the image from the backend API
      const response = await axios.get(
        `${API_URL}/user/receipts/${Number(receiptId)}/image`
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
    } catch (error: unknown) {
      // Check if this is a 404 error
      if (axios.isAxiosError(error) && error.response?.status === 404) {
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
  updateAssignments: async (
    receiptId: number | string,
    lineItemId: string,
    assignments: string[]
  ) => {
    const response = await axios.put(
      `${API_URL}/user/receipts/${Number(receiptId)}/assignments`,
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
  updateLineItem: async (
    receiptId: number | string,
    itemId: number | string,
    updateObj: UpdateLineItemPayload
  ) => {
    const parsed = UpdateLineItemPayloadSchema.safeParse(updateObj);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues.map((e) => e.message).join('; ') ||
          'Invalid update payload'
      );
    }
    const response = await axios.put<{ success: boolean }>(
      `${API_URL}/user/receipts/${Number(receiptId)}/line-items/${itemId}`,
      parsed.data
    );
    return response.data;
  },

  /**
   * Delete a line item from a receipt
   * @param {number} receiptId - The ID of the receipt to update
   * @param {number} itemId - The ID of the line item to delete
   * @returns {Promise} - A promise that resolves when the line item is deleted
   */
  deleteLineItem: async (
    receiptId: number | string,
    itemId: number | string
  ) => {
    const response = await axios.delete(
      `${API_URL}/user/receipts/${Number(receiptId)}/line-items/${itemId}`
    );
    return response.data;
  },

  /**
   * Add a new line item to a receipt
   * @param {number} receiptId - The ID of the receipt to update
   * @param {Object} lineItemData - The line item data to add
   * @returns {Promise} - A promise that resolves to the added line item
   */
  addLineItem: async (
    receiptId: number | string,
    lineItemData: LineItemPayload
  ) => {
    const response = await axios.post<{
      success: boolean;
      line_item: LineItem;
    }>(
      `${API_URL}/user/receipts/${Number(receiptId)}/line-items`,
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
  updateReceiptData: async (
    receiptId: number | string,
    updateObj: UpdateReceiptPayload
  ) => {
    const parsed = UpdateReceiptPayloadSchema.safeParse(updateObj);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues.map((e) => e.message).join('; ') ||
          'Invalid update payload'
      );
    }
    const response = await axios.put<{ success: boolean }>(
      `${API_URL}/user/receipts/${Number(receiptId)}/receipt-data`,
      parsed.data
    );
    return response.data;
  },
};

export default receiptService;
