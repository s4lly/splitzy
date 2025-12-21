import NumericInput from '@/components/NumericInput';
import {
  formatCurrency,
  truncateToTwoDecimals,
} from '@/components/Receipt/utils/format-currency';
import { Input } from '@/components/ui/input';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
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

  // Handle quantity change from NumericInput (both input and buttons)
  const handleNumericQuantityChange = (newQuantity: number) => {
    setFormQuantity(newQuantity);
    onQuantityChange(newQuantity);
    mutate({
      receiptId: String(result?.id),
      itemId: item.id,
      quantity: newQuantity,
    });
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
    <div className="flex flex-col gap-3 bg-background p-2">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
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

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Quantity</label>
        <NumericInput
          value={formQuantity}
          onChange={handleNumericQuantityChange}
          min={1}
          placeholder="Quantity"
        />
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
