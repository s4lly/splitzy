import { getIndividualItemTotalPrice } from "./utils/receipt-calculation";
import PersonAssignmentSection from "./PersonAssignmentSection";
import ReceiptLineItemEditMobile from "./ReceiptLineItemEditMobile";
import { formatCurrency } from "./utils/format-currency";
import { LineItemSchema, ReceiptSchema } from "@/lib/receiptSchemas";
import { z } from "zod";

export default function ReceiptLineItemsTableMobile({
  item,
  result,
  editLineItemsEnabled,
  people,
  togglePersonAssignment,
  isEditMode = false,
  onEditCancel,
}: {
  item: z.infer<typeof LineItemSchema>;
  result: z.infer<typeof ReceiptSchema>;
  editLineItemsEnabled: boolean | undefined;
  people: string[];
  togglePersonAssignment: (itemId: string, person: string) => void;
  isEditMode?: boolean;
  onEditCancel: () => void;
}) {
  if (isEditMode) {
    return (
      <ReceiptLineItemEditMobile
        item={item}
        result={result}
        people={people}
        togglePersonAssignment={togglePersonAssignment}
        onEditCancel={onEditCancel}
      />
    );
  }

  return (
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

        <PersonAssignmentSection
          item={item}
          people={people}
          togglePersonAssignment={togglePersonAssignment}
        />
      </div>
    </div>
  );
}
