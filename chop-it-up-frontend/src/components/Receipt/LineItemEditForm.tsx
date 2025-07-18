import { useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { X, Trash } from "lucide-react";
import { LineItemSchema, ReceiptSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import debounce from "lodash.debounce";
import { useLineItemUpdateMutation } from "./hooks/useLineItemUpdateMutation";
import { useLineItemDeleteMutation } from "./hooks/useLineItemDeleteMutation";
import LineItemForm from "./LineItemForm";

export default function LineItemEditForm({
  item,
  result,
  onEditCancel,
}: {
  item: z.infer<typeof LineItemSchema>;
  result: z.infer<typeof ReceiptSchema>;
  onEditCancel: () => void;
}) {
  const { mutate } = useLineItemUpdateMutation();
  const { mutate: deleteItem, isPending: isDeleting } =
    useLineItemDeleteMutation();

  const debouncedPersistName = useMemo(
    () =>
      debounce((value: string) => {
        mutate({
          receiptId: String(result?.id),
          itemId: item.id,
          name: value,
        });
      }, 300),
    [result?.id, item.id, mutate]
  );

  const debouncedPersistQuantity = useMemo(
    () =>
      debounce((value: number) => {
        mutate({
          receiptId: String(result?.id),
          itemId: item.id,
          quantity: value,
        });
      }, 300),
    [result?.id, item.id, mutate]
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
      <div className="flex justify-between items-center p-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleDeleteItem}
          disabled={isDeleting}
          className="text-red-500 border-red-500"
        >
          <Trash className="w-4 h-4 mr-2" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>

        <Button variant="outline" size="icon" onClick={onEditCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <LineItemForm
        item={item}
        result={result}
        onNameChange={handleNameChange}
        onQuantityChange={handleQuantityChange}
        mutate={mutate}
      />
    </div>
  );
}
