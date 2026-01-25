import { useItemAssignmentsUpdateMutation } from '@/components/Receipt/hooks/useItemAssignmentsUpdateMutation';
import { useLineItemDeleteMutation } from '@/components/Receipt/hooks/useLineItemDeleteMutation';
import { useLineItemUpdateMutation } from '@/components/Receipt/hooks/useLineItemUpdateMutation';
import type {
  DeleteLineItemData,
  MutationCallbackOptions,
  UpdateLineItemData,
} from '@/features/line-items/types';
import type { Receipt } from '@/models/Receipt';

export function useTanstackLineItemMutations(receipt: Receipt) {
  const updateLineItemMutation = useLineItemUpdateMutation();
  const deleteLineItemMutation = useLineItemDeleteMutation();
  const updateItemAssignmentsMutation = useItemAssignmentsUpdateMutation();

  /**
   * Get current receipt user IDs from assignments for a line item
   */
  const getCurrentReceiptUserIds = (itemId: string): string[] => {
    const item = receipt.lineItems.find((item) => item.id === itemId);
    if (!item) {
      return [];
    }
    // Extract receipt user IDs from assignments, filtering out deleted ones
    return item.assignments
      .filter((a) => !a.deletedAt)
      .map((a) => a.receiptUserId);
  };

  /**
   * Add an assignment for an existing receipt user to a line item.
   */
  const addExistingPersonAssignment = (
    itemId: string,
    receiptUserId: string
  ) => {
    const item = receipt.lineItems.find((item) => item.id === itemId);

    if (!item) {
      console.error(`Item with id ${itemId} not found`);
      return;
    }

    const currentReceiptUserIds = getCurrentReceiptUserIds(itemId);

    // Check if assignment already exists
    if (currentReceiptUserIds.includes(receiptUserId)) {
      console.info('Assignment already exists');
      return;
    }

    const newAssignments = [...currentReceiptUserIds, receiptUserId];

    console.info(`Adding person ${receiptUserId} to item ${itemId}`);

    // Persist to backend
    updateItemAssignmentsMutation.mutate({
      receiptId: String(receipt.id),
      lineItemId: itemId,
      assignments: newAssignments,
    });
  };

  /**
   * Add an assignment for a new receipt user (by display name) to a line item.
   * Note: This requires creating a receipt user first, which may not be supported
   * by the current backend API. This is a placeholder implementation.
   */
  const addNewPersonAssignment = (itemId: string, displayName: string) => {
    console.warn(
      `addNewPersonAssignment is not fully implemented for tanstack adapter. ` +
        `Display name: ${displayName}, Item ID: ${itemId}. ` +
        `Receipt users must be created separately before assignment.`
    );
    // TODO: Implement receipt user creation if backend API supports it
    // For now, this function is a placeholder
  };

  /**
   * Remove an assignment from a line item.
   */
  const removePersonAssignment = (itemId: string, assignmentId: string) => {
    const item = receipt.lineItems.find((item) => item.id === itemId);

    if (!item) {
      console.error(`Item with id ${itemId} not found`);
      return;
    }

    // Find the assignment to get its receipt user ID
    const assignment = item.assignments.find((a) => a.id === assignmentId);

    if (!assignment) {
      console.error(`Assignment with id ${assignmentId} not found`);
      return;
    }

    const currentReceiptUserIds = getCurrentReceiptUserIds(itemId);
    const newAssignments = currentReceiptUserIds.filter(
      (id) => id !== assignment.receiptUserId
    );

    console.info(
      `Removing person ${assignment.receiptUserId} from item ${itemId}`
    );

    // Persist to backend
    updateItemAssignmentsMutation.mutate({
      receiptId: String(receipt.id),
      lineItemId: itemId,
      assignments: newAssignments,
    });
  };

  const handleUpdateLineItem = (data: UpdateLineItemData) => {
    console.info(
      `Updating line item ${data.itemId} in receipt ${data.receiptId}`,
      {
        name: data.name,
        quantity: data.quantity,
        price_per_item: data.price_per_item,
      }
    );

    updateLineItemMutation.mutate(data, {
      onSuccess: () => {
        console.info('Successfully updated line item');
      },
      onError: (error) => {
        console.error('Failed to update line item:', error);
        // You could add toast notifications or other error handling here
      },
    });
  };

  const handleDeleteLineItem = (
    data: DeleteLineItemData,
    options?: MutationCallbackOptions
  ) => {
    console.info(
      `Deleting line item ${data.itemId} from receipt ${data.receiptId}`
    );

    deleteLineItemMutation.mutate(data, {
      onSuccess: () => {
        console.info('Successfully deleted line item');
        options?.onSuccess?.();
      },
      onError: (error) => {
        console.error('Failed to delete line item:', error);
        options?.onError?.(error as Error);
        // You could add toast notifications or other error handling here
      },
    });
  };

  return {
    addExistingPersonAssignment,
    addNewPersonAssignment,
    removePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    isDeleting: deleteLineItemMutation.isPending,
  };
}
