import { useEffect, useMemo } from 'react';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import debounce from 'lodash.debounce';
import LineItemForm from './LineItemForm';

export default function LineItemEditForm({
  item,
  receipt,
  onEditCancel,
  onUpdateLineItem,
}: {
  item: ReceiptLineItem;
  receipt: Receipt;
  onEditCancel: () => void;
  onUpdateLineItem: (data: {
    receiptId: string;
    itemId: string;
    name?: string;
    quantity?: number;
    price_per_item?: number;
  }) => void;
}) {

  const debouncedPersistName = useMemo(
    () =>
      debounce((value: string) => {
        onUpdateLineItem({
          receiptId: String(receipt.id),
          itemId: item.id,
          name: value,
        });
      }, 300),
    [receipt.id, item.id, onUpdateLineItem]
  );

  const debouncedPersistQuantity = useMemo(
    () =>
      debounce((value: number) => {
        onUpdateLineItem({
          receiptId: String(receipt.id),
          itemId: item.id,
          quantity: value,
        });
      }, 300),
    [receipt.id, item.id, onUpdateLineItem]
  );

  useEffect(() => {
    return () => {
      debouncedPersistName.cancel();
      debouncedPersistQuantity.cancel();
    };
  }, [debouncedPersistName, debouncedPersistQuantity]);

  // Persist name change with debounce
  const handleNameChange = (name: string) => {
    debouncedPersistName(name);
  };

  // Persist quantity change with debounce
  const handleQuantityChange = (quantity: number) => {
    debouncedPersistQuantity(quantity);
  };

  return (
    <div className="w-full">
      <LineItemForm
        item={item}
        receiptId={String(receipt.id)}
        onNameChange={handleNameChange}
        onQuantityChange={handleQuantityChange}
        mutate={onUpdateLineItem}
        onEditCancel={onEditCancel}
      />
    </div>
  );
}
