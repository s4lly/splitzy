/**
 * Data for updating an existing line item's properties.
 * Matches backend allowlist: name, quantity, price_per_item, total_price, assignments.
 */
export interface UpdateLineItemData {
  receiptId: string;
  itemId: string;
  name?: string;
  quantity?: number;
  price_per_item?: number;
  total_price?: number;
  assignments?: string[];
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
 * Hook normalizes this to LineItemPayload (name required, defaults for rest) when calling the API.
 */
export interface LineItemFormData {
  name?: string;
  quantity?: number;
  price_per_item?: number;
  total_price?: number;
  assignments?: string[];
}

/**
 * Data for adding a new line item to a receipt.
 */
export interface AddLineItemData {
  receiptId: string;
  lineItemData: LineItemFormData;
}
