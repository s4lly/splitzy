import { getIndividualItemTotalPrice } from "./utils/receipt-calculation";
import PersonAssignmentSection from "./PersonAssignmentSection";
import ReceiptLineItemEditMobile from "./ReceiptLineItemEditMobile";
import MobileAssignmentList from "./MobileAssignmentList";
import { formatCurrency } from "./utils/format-currency";
import { LineItemSchema, ReceiptSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import { Separator } from "../ui/separator";

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
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [assignmentItemId, setAssignmentItemId] = useState<string | null>(null);

  // Edit mode handlers
  const handleEditOpen = (e: React.MouseEvent, itemId: string) => {
    setEditItemId(itemId);
    setAssignmentItemId(null);

    e.stopPropagation();
  };
  const handleEditClose = () => setEditItemId(null);

  // Assignment list handlers
  const handleAssignmentOpen = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setEditItemId(null);

    setAssignmentItemId((prevItemId) =>
      prevItemId === itemId ? null : itemId
    );
  };
  const handleAssignmentClose = () => {
    setAssignmentItemId(null);
  };

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
            (editItemId === item.id || assignmentItemId === item.id) &&
              "ring-2 ring-accent ring-blue-300"
          )}
        >
          {editItemId === item.id ? (
            <ReceiptLineItemEditMobile
              item={item}
              result={result}
              onEditCancel={handleEditClose}
            />
          ) : (
            <div
              tabIndex={0}
              role="button"
              aria-pressed={editItemId === item.id}
              onClick={(e) => handleEditOpen(e, item.id)}
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  editItemId !== item.id
                ) {
                  setEditItemId(item.id);
                  e.stopPropagation();
                }
              }}
            >
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
              <div className="p-2 flex flex-col gap-2">
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
              </div>
            </div>
          )}

          {assignmentItemId === item.id ? (
            <>
            <Separator />
              <MobileAssignmentList
                possiblePeople={people}
                onAddAssignment={(person) =>
                  togglePersonAssignment(item.id, person)
                }
                onRemoveAssignment={(person) =>
                  togglePersonAssignment(item.id, person)
                }
                item={item}
                formPricePerItem={item.price_per_item}
                formQuantity={item.quantity}
                onAssignmentCancel={handleAssignmentClose}
              />
            </>
          ) : (
            <div
              className="p-2"
              onClick={(e) => handleAssignmentOpen(e, item.id)}
            >
              <PersonAssignmentSection item={item} people={people} />
            </div>
          )}
        </motion.div>
      ))}
    </>
  );
}
