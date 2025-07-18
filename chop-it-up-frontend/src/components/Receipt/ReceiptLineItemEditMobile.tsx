import { useState, useEffect, useMemo } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Minus, Plus, X, Trash } from "lucide-react";
import { Separator } from "../ui/separator";
import { formatCurrency, truncateToTwoDecimals } from "./utils/format-currency";
import { LineItemSchema, ReceiptSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import debounce from "lodash.debounce";
import { useLineItemMutation } from "./hooks/useLineItemMutation";
import { useDeleteLineItemMutation } from "./hooks/useDeleteLineItemMutation";

export default function ReceiptLineItemEditMobile({
  item,
  result,
  onEditCancel,
}: {
  item: z.infer<typeof LineItemSchema>;
  result: z.infer<typeof ReceiptSchema>;
  onEditCancel: () => void;
}) {
  const [formName, setFormName] = useState(item.name);
  const [formQuantity, setFormQuantity] = useState<number>(item.quantity);
  const [formPricePerItem, setFormPricePerItem] = useState<string>(
    truncateToTwoDecimals(item.price_per_item)
  );

  const formTotal = Number(formQuantity) * (parseFloat(formPricePerItem) || 0);

  const { mutate } = useLineItemMutation();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteLineItemMutation();

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
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormName(e.target.value);
    debouncedPersistName(e.target.value);
  };

  // Persist quantity change with debounce
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setFormQuantity(value);
    debouncedPersistQuantity(value);
  };

  // For price, only persist after truncation (onBlur)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormPricePerItem(e.target.value);
  };

  const handlePriceBlur = () => {
    const num = parseFloat(formPricePerItem);
    const originalTruncated = Math.trunc(item.price_per_item * 100) / 100;
    if (!isNaN(num)) {
      const truncated = Math.trunc(num * 100) / 100;
      const truncatedStr = truncateToTwoDecimals(truncated);
      setFormPricePerItem(truncatedStr);
      if (truncated !== originalTruncated) {
        mutate({
          receiptId: String(result?.id),
          itemId: item.id,
          price_per_item: truncated,
        });
      }
    } else {
      setFormPricePerItem("0.00");
      if (originalTruncated !== 0) {
        mutate({
          receiptId: String(result?.id),
          itemId: item.id,
          price_per_item: 0,
        });
      }
    }
  };

  // Persist price per item when Enter is pressed
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Prevent form submission
      e.preventDefault();
      handlePriceBlur();
    }
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

      <div>
        <form
          className="md:hidden p-3 flex flex-col gap-3 bg-background"
          onSubmit={(e) => e.preventDefault()} // No submit action
        >
          <div className="flex flex-col gap-2">
            <Input
              value={formName}
              onChange={handleNameChange}
              placeholder="Item name"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Quantity</label>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  setFormQuantity((q: number) => {
                    const newQ = Math.max(1, q - 1);
                    mutate({
                      receiptId: String(result?.id),
                      itemId: item.id,
                      quantity: newQ,
                    });
                    return newQ;
                  });
                }}
                className="rounded-full shrink-0"
                tabIndex={-1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={formQuantity}
                onChange={handleQuantityChange}
                placeholder="Quantity"
                min={1}
                required
                className="text-center"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  setFormQuantity((q: number) => {
                    const newQ = q + 1;
                    mutate({
                      receiptId: String(result?.id),
                      itemId: item.id,
                      quantity: newQ,
                    });
                    return newQ;
                  });
                }}
                className="rounded-full shrink-0"
                tabIndex={-1}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Unit Price</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-lg pl-2 pr-1 select-none">
                $
              </span>
              <Input
                type="number"
                value={formPricePerItem}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
                onKeyDown={handlePriceKeyDown}
                placeholder="Unit price"
                min={0}
                step="0.01"
                required
                className="text-center"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-base font-medium">
              <span>Total</span>
              <span>{formatCurrency(formTotal)}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
