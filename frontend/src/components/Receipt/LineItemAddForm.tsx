import { Trans } from '@lingui/react/macro';
import { useZero } from '@rocicorp/zero/react';
import { mutators } from '@splitzy/shared-zero/mutators';
import Decimal from 'decimal.js';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import LineItemForm from '@/components/Receipt/LineItemForm';
import { Button } from '@/components/ui/button';
import type { UpdateLineItemData } from '@/features/line-items/types';
import { receiptIdAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

function isStringEmpty(str: string) {
  return str == null || str.trim() === '';
}

export default function LineItemAddForm({
  onAddCancel,
}: {
  onAddCancel: () => void;
}) {
  const zero = useZero();
  const receiptId = useAtomValue(receiptIdAtom);
  const [isPending, setIsPending] = useState(false);

  // Local state for form values with default values
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    price_per_item: 0,
  });

  const handleAddItem = async () => {
    if (!receiptId) {
      console.error('Cannot add line item: receiptId is missing');
      return;
    }

    setIsPending(true);

    try {
      const id = uuidv4();
      const quantity = formData.quantity ?? 1;
      const pricePerItem = formData.price_per_item ?? 0;
      const totalPrice = quantity * pricePerItem;

      const result = zero.mutate(
        mutators.lineItems.insert({
          id,
          receipt_id: Number(receiptId),
          name: formData.name,
          quantity,
          price_per_item: pricePerItem,
          total_price: totalPrice,
          created_at: Date.now(),
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error('Failed to add line item:', clientResult.error.message);
      } else {
        console.info('Successfully added line item');
        onAddCancel();
      }
    } finally {
      setIsPending(false);
    }
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
  const mutate = (data: UpdateLineItemData) => {
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
    deletedAt: null,
    assignments: [],
  };

  if (!receiptId) {
    return null;
  }

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
        <Button onClick={onAddCancel} variant="outline" disabled={isPending}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          onClick={handleAddItem}
          variant="outline"
          disabled={isPending || isStringEmpty(formData.name)}
        >
          <Trans>Add</Trans>
        </Button>
      </div>
    </div>
  );
}
