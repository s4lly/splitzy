import LineItemForm from '@/components/Receipt/LineItemForm';
import type { ReceiptLineItem } from '@/models/Receipt';
import Decimal from 'decimal.js';
import { useState } from 'react';
import { Button } from '../ui/button';

function isStringEmpty(str: string) {
  return str == null || str.trim() === '';
}

export default function LineItemAddForm({
  receiptId,
  onAddCancel,
  onAddLineItem,
  isPending,
}: {
  receiptId: string;
  onAddCancel: () => void;
  onAddLineItem: (data: {
    receiptId: string;
    lineItemData: {
      name?: string;
      quantity?: number;
      price_per_item?: number;
    };
  }) => void;
  isPending?: boolean;
}) {

  // Local state for form values with default values
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    price_per_item: 0,
  });

  const handleAddItem = () => {
    onAddLineItem({
      receiptId,
      lineItemData: formData,
    });
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
  const mutate = (data: {
    receiptId: string;
    itemId: string;
    name?: string;
    quantity?: number;
    price_per_item?: number;
  }) => {
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

  // Create a temporary ReceiptLineItem for the form
  const tempItem: ReceiptLineItem = {
    id: 'temp', // Temporary ID for the form
    name: formData.name,
    quantity: new Decimal(formData.quantity),
    pricePerItem: new Decimal(formData.price_per_item),
    totalPrice: new Decimal(formData.quantity * formData.price_per_item),
    assignments: [],
  };

  return (
    <div className="w-full">
      <LineItemForm
        item={tempItem}
        receiptId={receiptId}
        onNameChange={handleNameChange}
        onQuantityChange={handleQuantityChange}
        mutate={mutate}
      />

      <div className="flex justify-end gap-2 p-2">
        <Button
          onClick={onAddCancel}
          variant="outline"
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddItem}
          variant="outline"
          disabled={isPending || isStringEmpty(formData.name)}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
