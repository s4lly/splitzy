import { formatCurrency } from "./utils/format-currency";
import PersonAssignmentSection from "./PersonAssignmentSection";
import { getIndividualItemTotalPrice } from "./utils/receipt-calculation";
import { motion } from "framer-motion";
import { LineItemSchema } from "@/lib/receiptSchemas";
import { z } from "zod";

export default function LineItemsTableDesktop({
  line_items,
  people,
}: {
  line_items: z.infer<typeof LineItemSchema>[];
  people: string[];
}) {
  return (
    <>
      <div className="hidden md:grid md:grid-cols-12 border-b-2 border-border pb-3 gap-3 text-base font-medium">
        <div className="col-span-5">Item</div>
        <div className="col-span-1 text-right">Qty</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-2 text-center">Assigned To</div>
      </div>

      {line_items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className={`md:grid md:grid-cols-12 md:gap-3 text-base md:py-3 md:border-b md:last:border-0 md:items-center`}
        >
          <div className="hidden md:block col-span-5 truncate">
            <span className="text-base font-medium">{item.name}</span>
          </div>
          <div className="hidden md:block col-span-1 text-right">
            <span className="text-base font-medium">{item.quantity}</span>
          </div>
          <div className="hidden md:block col-span-2 text-right">
            <span className="text-base font-medium">
              {formatCurrency(item.price_per_item)}
            </span>
          </div>
          <div className="hidden md:block col-span-2 text-right font-medium">
            {formatCurrency(getIndividualItemTotalPrice(item))}
          </div>
          <div className="hidden md:flex col-span-2 justify-center">
            <PersonAssignmentSection
              item={item}
              people={people}
              className="justify-center"
            />
          </div>
        </motion.div>
      ))}
    </>
  );
}
