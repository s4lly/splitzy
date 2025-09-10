import LineItemForm from '@/components/Receipt/LineItemForm';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { useState } from 'react';
import ActionButtons from '@/components/Receipt/ActionButtons';
import { useLineItemAddMutation } from '@/components/Receipt/hooks/useLineItemAddMutation';

export default function LineItemAddForm({
  result,
  onAddCancel,
}: {
  result: z.infer<typeof ReceiptSchema>;
  onAddCancel: () => void;
}) {
  const addLineItemMutation = useLineItemAddMutation();

  // Local state for form values with default values
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    price_per_item: 0,
  });

  const handleAddItem = () => {
    addLineItemMutation.mutate(
      {
        receiptId: result.id.toString(),
        lineItemData: formData,
      },
      {
        onSuccess: () => {
          onAddCancel(); // Close the form after successful addition
        },
      }
    );
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
  };

  const handleQuantityChange = (quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      quantity,
    }));
  };

  // Create a mutate function that updates local state instead of calling the API
  const mutate = (
    data: Partial<z.infer<typeof LineItemSchema>> & {
      receiptId: string;
      itemId: string;
    }
  ) => {
    // Update local state based on what field changed
    if ('price_per_item' in data) {
      setFormData((prev) => ({
        ...prev,
        price_per_item: data.price_per_item || 0,
      }));
    }
    if ('quantity' in data) {
      setFormData((prev) => ({
        ...prev,
        quantity: data.quantity || 1,
      }));
    }
    if ('name' in data) {
      setFormData((prev) => ({
        ...prev,
        name: data.name || '',
      }));
    }
  };

  return (
    <div className="w-full">
      <LineItemForm
        item={{
          id: 'temp', // Temporary ID for the form
          name: formData.name,
          quantity: formData.quantity,
          price_per_item: formData.price_per_item,
          total_price: formData.quantity * formData.price_per_item,
          assignments: [],
        }}
        result={result}
        onNameChange={handleNameChange}
        onQuantityChange={handleQuantityChange}
        mutate={mutate}
      />

      <ActionButtons
        onConstructive={handleAddItem}
        onCancel={onAddCancel}
        constructiveLabel="Add"
        isPending={addLineItemMutation.isPending}
      />
    </div>
  );
}
