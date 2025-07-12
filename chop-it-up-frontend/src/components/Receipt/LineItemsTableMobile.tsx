import { getIndividualItemTotalPrice } from "./utils/receipt-calculation";
import PersonAssignmentSection from "./PersonAssignmentSection";
import ReceiptLineItemEditMobile from "./ReceiptLineItemEditMobile";
import { formatCurrency } from "./utils/format-currency";
import { LineItemSchema, ReceiptSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { useMobile } from "@/hooks/use-mobile";
import clsx from "clsx";

export default function ReceiptLineItemsTableMobile({
  line_items,
  result,
  editLineItemsEnabled,
  people,
  togglePersonAssignment,
}: {
  line_items: z.infer<typeof LineItemSchema>[];
  result: z.infer<typeof ReceiptSchema>;
  editLineItemsEnabled: boolean | undefined;
  people: string[];
  togglePersonAssignment: (itemId: string, person: string) => void;
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);

  const isMobile = useMobile();

  // Touch event handlers for active state
  const handleTouchStart = (itemId: string) => setActiveItemId(itemId);
  const handleTouchEnd = (itemId: string) =>
    setActiveItemId((prev) => (prev === itemId ? null : prev));
  const handleTouchCancel = (itemId: string) =>
    setActiveItemId((prev) => (prev === itemId ? null : prev));

  // Edit mode handlers
  const handleEditStart = (
    e: React.TouchEvent | React.MouseEvent,
    itemId: string
  ) => {
    // Only trigger on touch or click, not on drag
    if (isMobile && editItemId !== itemId) {
      setEditItemId(itemId);
    }
    e.stopPropagation();
  };
  const handleEditCancel = () => setEditItemId(null);

  return (
    <>
      {line_items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className={clsx(
            "border-4 rounded-lg border-border/40 overflow-hidden mb-3 text-base",
            editItemId === item.id && "border-4",
            activeItemId === item.id &&
              !editItemId &&
              " ring-2 ring-primary bg-primary/10"
          )}
          onTouchStart={() => handleTouchStart(item.id)}
          onTouchEnd={() => handleTouchEnd(item.id)}
          onTouchCancel={() => handleTouchCancel(item.id)}
          onClick={(e) => handleEditStart(e, item.id)}
        >
          {editItemId === item.id ? (
            <ReceiptLineItemEditMobile
              item={item}
              result={result}
              people={people}
              togglePersonAssignment={togglePersonAssignment}
              onEditCancel={handleEditCancel}
            />
          ) : (
            <div className="md:hidden">
              <div className="p-2 bg-muted/10 border-b border-border/40 flex justify-between items-center gap-2">
                <span className="text-base font-medium">{item.name}</span>
                <div className="text-right font-semibold">
                  {formatCurrency(
                    editLineItemsEnabled
                      ? getIndividualItemTotalPrice(item)
                      : item.total_price
                  )}
                </div>
              </div>
              <div className="p-2 sm:p-3 flex flex-col gap-2">
                <div className="flex gap-2 items-baseline text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="text-base font-medium text-right flex-1">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex gap-2 items-baseline text-sm">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="text-base font-medium text-right flex-1">
                    {formatCurrency(item.price_per_item)}
                  </span>
                </div>

                <PersonAssignmentSection item={item} people={people} />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </>
  );
}
