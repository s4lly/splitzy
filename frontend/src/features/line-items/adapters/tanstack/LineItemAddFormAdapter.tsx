import LineItemAddForm from '@/components/Receipt/LineItemAddForm';
import { useLineItemAddMutation } from '@/components/Receipt/hooks/useLineItemAddMutation';

export function LineItemAddFormAdapter({
  receiptId,
  onAddCancel,
}: {
  receiptId: string;
  onAddCancel: () => void;
}) {
  const addLineItemMutation = useLineItemAddMutation();

  // Wrap the mutation with logging and error handling
  const handleAddLineItem = (data: {
    receiptId: string;
    lineItemData: {
      name?: string;
      quantity?: number;
      price_per_item?: number;
    };
  }) => {
    console.info(`Adding line item to receipt ${data.receiptId}`, {
      name: data.lineItemData.name,
      quantity: data.lineItemData.quantity,
      price_per_item: data.lineItemData.price_per_item,
    });

    addLineItemMutation.mutate(data, {
      onSuccess: () => {
        console.info('Successfully added line item');
        onAddCancel(); // Close the form after successful addition
      },
      onError: (error) => {
        console.error('Failed to add line item:', error);
        // You could add toast notifications or other error handling here
      },
    });
  };

  return (
    <LineItemAddForm
      receiptId={receiptId}
      onAddCancel={onAddCancel}
      onAddLineItem={handleAddLineItem}
      isPending={addLineItemMutation.isPending}
    />
  );
}

