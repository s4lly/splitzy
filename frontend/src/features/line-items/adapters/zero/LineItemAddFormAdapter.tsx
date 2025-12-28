import LineItemAddForm from '@/components/Receipt/LineItemAddForm';
import type { AddLineItemData } from '@/features/line-items/types';
import { receiptIdAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import { useAtomValue } from 'jotai';
import { v4 as uuidv4 } from 'uuid';

export function LineItemAddFormAdapter({
  onAddCancel,
}: {
  onAddCancel: () => void;
}) {
  const zero = useZero();
  const receiptId = useAtomValue(receiptIdAtom);

  const handleAddLineItem = async (data: AddLineItemData) => {
    if (!receiptId) {
      console.error('Cannot add line item: receiptId is missing');
      return;
    }

    const id = uuidv4();
    const quantity = data.lineItemData.quantity ?? 1;
    const pricePerItem = data.lineItemData.price_per_item ?? 0;
    const totalPrice = quantity * pricePerItem;

    const result = zero.mutate(
      mutators.lineItems.insert({
        id,
        receipt_id: Number(data.receiptId),
        name: data.lineItemData.name,
        quantity,
        price_per_item: pricePerItem,
        total_price: totalPrice,
        assignments: [],
        created_at: Date.now(),
      })
    );

    const clientResult = await result.client;

    if (clientResult.type === 'error') {
      console.error('Failed to add line item:', clientResult.error.message);
    } else {
      console.info('Successfully added line item');
    }
  };

  if (!receiptId) {
    return null;
  }

  return (
    <LineItemAddForm
      receiptId={receiptId}
      onAddCancel={onAddCancel}
      onAddLineItem={handleAddLineItem}
      isPending={false}
    />
  );
}
