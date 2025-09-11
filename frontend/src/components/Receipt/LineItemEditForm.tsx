import { useEffect, useMemo } from 'react';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import debounce from 'lodash.debounce';
import { useLineItemUpdateMutation } from './hooks/useLineItemUpdateMutation';
import LineItemForm from './LineItemForm';

export default function LineItemEditForm({
  item,
  result,
  onEditCancel,
}: {
  item: z.infer<typeof LineItemSchema>;
  result: z.infer<typeof ReceiptSchema>;
  onEditCancel: () => void;
}) {
  const { mutate: updateItem } = useLineItemUpdateMutation();

  const debouncedPersistName = useMemo(
    () =>
      debounce((value: string) => {
        updateItem({
          receiptId: String(result?.id),
          itemId: item.id,
          name: value,
        });
      }, 300),
    [result?.id, item.id, updateItem]
  );

  const debouncedPersistQuantity = useMemo(
    () =>
      debounce((value: number) => {
        updateItem({
          receiptId: String(result?.id),
          itemId: item.id,
          quantity: value,
        });
      }, 300),
    [result?.id, item.id, updateItem]
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
        result={result}
        onNameChange={handleNameChange}
        onQuantityChange={handleQuantityChange}
        mutate={updateItem}
        onEditCancel={onEditCancel}
      />
    </div>
  );
}
