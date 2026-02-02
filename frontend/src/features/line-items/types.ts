/**
 * Data for updating an existing line item's properties.
 */
export interface UpdateLineItemData {
  receiptId: string;
  itemId: string;
  name?: string;
  quantity?: number;
  price_per_item?: number;
}

/**
 * Data for deleting a line item from a receipt.
 */
export interface DeleteLineItemData {
  receiptId: string;
  itemId: string;
}

/**
 * Callback options for mutation operations.
 */
export interface MutationCallbackOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Form data for creating a new line item (without computed fields).
 */
export interface LineItemFormData {
  name?: string;
  quantity?: number;
  price_per_item?: number;
}

/**
 * Data for adding a new line item to a receipt.
 */
export interface AddLineItemData {
  receiptId: string;
  lineItemData: LineItemFormData;
}
