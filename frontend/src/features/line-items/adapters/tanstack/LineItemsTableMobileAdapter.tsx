import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import { useItemAssignmentsUpdateMutation } from '@/components/Receipt/hooks/useItemAssignmentsUpdateMutation';
import { useLineItemDeleteMutation } from '@/components/Receipt/hooks/useLineItemDeleteMutation';
import { useLineItemUpdateMutation } from '@/components/Receipt/hooks/useLineItemUpdateMutation';
import type { Receipt, ReceiptLineItem } from '@/models/Receipt';

export function LineItemsTableMobileAdapter({
  line_items,
  receipt,
  people,
}: {
  line_items: readonly ReceiptLineItem[];
  receipt: Receipt;
  people: string[];
}) {
  const updateLineItemMutation = useLineItemUpdateMutation();
  const deleteLineItemMutation = useLineItemDeleteMutation();
  const updateItemAssignmentsMutation = useItemAssignmentsUpdateMutation();

  const togglePersonAssignment = async (itemId: string, person: string) => {
    const item = receipt.lineItems.find((item) => item.id === itemId);

    if (!item) {
      console.error(`Item with id ${itemId} not found`);
      return;
    }

    const currentAssignments = item.assignments;
    const isPersonAssigned = currentAssignments.includes(person);

    const newAssignments = isPersonAssigned
      ? currentAssignments.filter((p) => p !== person)
      : [...currentAssignments, person];

    if (isPersonAssigned) {
      console.info(`Removing person ${person} from item ${itemId}`);
    } else {
      console.info(`Adding person ${person} to item ${itemId}`);
    }

    // Persist to backend
    updateItemAssignmentsMutation.mutate({
      receiptId: String(receipt.id),
      lineItemId: itemId,
      assignments: newAssignments,
    });
  };

  // Wrap the update mutation with logging and error handling
  const handleUpdateLineItem = (data: {
    receiptId: string;
    itemId: string;
    name?: string;
    quantity?: number;
    price_per_item?: number;
  }) => {
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

  // Wrap the delete mutation with logging and error handling
  const handleDeleteLineItem = (
    data: {
      receiptId: string;
      itemId: string;
    },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
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

  return (
    <LineItemsTableMobile
      line_items={line_items}
      receipt={receipt}
      people={people}
      togglePersonAssignment={togglePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={deleteLineItemMutation.isPending}
    />
  );
}
