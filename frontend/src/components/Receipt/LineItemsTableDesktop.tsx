import { formatCurrency } from './utils/format-currency';
import PersonAssignmentSection from './PersonAssignmentSection';
import { getIndividualItemTotalPrice } from './utils/receipt-calculation';
import { motion } from 'framer-motion';
import { LineItemSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';

export default function LineItemsTableDesktop({
  line_items,
  people,
}: {
  line_items: z.infer<typeof LineItemSchema>[];
  people: string[];
}) {
  return (
    <>
      <div className="hidden gap-3 border-b-2 border-border pb-3 text-base font-medium md:grid md:grid-cols-12">
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
          className={`text-base md:grid md:grid-cols-12 md:items-center md:gap-3 md:border-b md:py-3 md:last:border-0`}
        >
          <div className="col-span-5 hidden truncate md:block">
            <span className="text-base font-medium">{item.name}</span>
          </div>
          <div className="col-span-1 hidden text-right md:block">
            <span className="text-base font-medium">{item.quantity}</span>
          </div>
          <div className="col-span-2 hidden text-right md:block">
            <span className="text-base font-medium">
              {formatCurrency(item.price_per_item)}
            </span>
          </div>
          <div className="col-span-2 hidden text-right font-medium md:block">
            {formatCurrency(getIndividualItemTotalPrice(item))}
          </div>
          <div className="col-span-2 hidden justify-center md:flex">
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
