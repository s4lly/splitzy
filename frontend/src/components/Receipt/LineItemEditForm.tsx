import { useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { X, Trash, Loader2 } from 'lucide-react';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import debounce from 'lodash.debounce';
import { useLineItemUpdateMutation } from './hooks/useLineItemUpdateMutation';
import { useLineItemDeleteMutation } from './hooks/useLineItemDeleteMutation';
import LineItemForm from './LineItemForm';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/use-mobile';

export default function LineItemEditForm({
  item,
  result,
  onEditCancel,
}: {
  item: z.infer<typeof LineItemSchema>;
  result: z.infer<typeof ReceiptSchema>;
  onEditCancel: () => void;
}) {
  const { mutate: updateItem, isPending: isUpdating } =
    useLineItemUpdateMutation();
  const { mutate: deleteItem, isPending: isDeleting } =
    useLineItemDeleteMutation();
  const isMobile = useMobile();

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

  // Handle delete item
  const handleDeleteItem = () => {
    deleteItem({
      receiptId: String(result?.id),
      itemId: item.id,
    });
    onEditCancel(); // Close the edit form after deletion
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center justify-between bg-background p-2',
          !isMobile && 'justify-end'
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleDeleteItem}
          disabled={isDeleting || isUpdating}
          className={cn('border-red-500 text-red-500', !isMobile && 'hidden')}
        >
          <Trash className="mr-2 h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>

        <div className="flex items-center">
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
          <Button variant="outline" size="icon" onClick={onEditCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <LineItemForm
        item={item}
        result={result}
        onNameChange={handleNameChange}
        onQuantityChange={handleQuantityChange}
        mutate={updateItem}
      />
    </div>
  );
}
