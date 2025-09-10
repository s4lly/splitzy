import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, ChevronDown } from 'lucide-react';
import {
  formatCurrency,
  truncateToTwoDecimals,
} from '@/components/Receipt/utils/format-currency';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toggle } from '../ui/toggle';

export default function LineItemForm({
  item,
  result,
  onNameChange,
  onQuantityChange,
  mutate,
  onEditCancel,
}: {
  item: z.infer<typeof LineItemSchema>;
  result: z.infer<typeof ReceiptSchema>;
  onNameChange: (name: string) => void;
  onQuantityChange: (quantity: number) => void;
  mutate: (
    data: Partial<z.infer<typeof LineItemSchema>> & {
      receiptId: string;
      itemId: string;
    }
  ) => void;
  onEditCancel?: () => void;
}) {
  const [formName, setFormName] = useState(item.name);
  const [formQuantity, setFormQuantity] = useState<number>(item.quantity);
  const [formPricePerItem, setFormPricePerItem] = useState<string>(
    truncateToTwoDecimals(item.price_per_item)
  );
  const [isNameFocused, setIsNameFocused] = useState(false);

  const formTotal = Number(formQuantity) * (parseFloat(formPricePerItem) || 0);

  // Persist name change with debounce
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormName(e.target.value);
    onNameChange(e.target.value);
  };

  // Persist quantity change with debounce
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const value = Number.isFinite(raw) ? Math.max(1, raw) : 1;
    setFormQuantity(value);
    onQuantityChange(value);
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
      setFormPricePerItem('0.00');
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
    if (e.key === 'Enter') {
      handlePriceBlur();
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <motion.div
          className="flex-1"
          layout
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            layout: {
              type: 'spring',
              stiffness: 300,
              damping: 30,
            },
          }}
        >
          <Input
            value={formName}
            onChange={handleNameChange}
            onFocus={() => setIsNameFocused(true)}
            onBlur={() => setIsNameFocused(false)}
            placeholder="Item name"
            required
          />
        </motion.div>

        {!isNameFocused && (
          <motion.span
            key="formTotal"
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              layout: {
                type: 'spring',
                stiffness: 300,
                damping: 30,
              },
            }}
            className="whitespace-nowrap text-right font-semibold"
          >
            {formatCurrency(formTotal)}
          </motion.span>
        )}

        {onEditCancel && (
          <Toggle pressed onClick={onEditCancel}>
            <ChevronDown />
          </Toggle>
        )}
      </div>

      <Separator />

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
            className="shrink-0 rounded-full"
          >
            <Minus className="h-4 w-4" />
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
            className="shrink-0 rounded-full"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Unit Price</label>
        <div className="flex items-center gap-2">
          <span className="select-none pl-2 pr-1 text-lg text-muted-foreground">
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
    </div>
  );
}
