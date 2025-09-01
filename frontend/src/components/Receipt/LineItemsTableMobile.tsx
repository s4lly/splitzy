import { getIndividualItemTotalPrice } from './utils/receipt-calculation';
import PersonAssignmentSection from './PersonAssignmentSection';
import LineItemEditForm from './LineItemEditForm';
import MobileAssignmentList from './MobileAssignmentList';
import { formatCurrency } from './utils/format-currency';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Separator } from '../ui/separator';
import LineItemCard from './components/LineItemCard';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react';
import { Toggle } from '../ui/toggle';
import { cn } from '@/lib/utils';

export default function LineItemsTableMobile({
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
      {line_items.map((item) => {
        const showReducedDetails = assignmentItemId === item.id;
        const showReducedAssignments = editItemId === item.id;

        return (
          <LineItemCard
            key={item.id}
            selected={editItemId === item.id || assignmentItemId === item.id}
          >
            {/* line item details */}
            {editItemId === item.id ? (
              // edit
              <LineItemEditForm
                item={item}
                result={result}
                onEditCancel={handleEditClose}
              />
            ) : (
              // view
              <>
                <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/10 p-2">
                  <span className="text-base font-medium">{item.name}</span>
                  <div className="flex items-center">
                    <div className="text-right font-semibold">
                      {formatCurrency(
                        editLineItemsEnabled
                          ? getIndividualItemTotalPrice(item)
                          : item.total_price
                      )}
                    </div>

                    <Toggle onClick={(e) => handleEditOpen(e, item.id)}>
                      {!showReducedDetails ? <Pencil /> : <ChevronUp />}
                    </Toggle>
                  </div>
                </div>

                {!showReducedDetails && (
                  <div className="flex flex-col gap-2 p-2">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="flex-1 text-right text-base font-medium">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="flex-1 text-right text-base font-medium">
                        {formatCurrency(item.price_per_item)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* assignments */}
            {assignmentItemId === item.id ? (
              // edit
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
                receiptId={String(result?.id)}
              />
            ) : (
              // view
              <div
                className={cn(
                  'flex p-2',
                  showReducedAssignments
                    ? 'justify-between gap-1 border-t border-border/40'
                    : 'flex-col'
                )}
              >
                <div className={cn('flex items-center justify-between')}>
                  <span className="text-nowrap text-sm font-medium">
                    Assigned to:
                  </span>

                  {!showReducedAssignments && (
                    <Toggle onClick={(e) => handleAssignmentOpen(e, item.id)}>
                      {item.assignments.length === 0 ? <Plus /> : <Pencil />}
                    </Toggle>
                  )}
                </div>

                {item.assignments.length > 0 && (
                  <PersonAssignmentSection
                    className={cn(showReducedAssignments && 'justify-end')}
                    item={item}
                    people={people}
                  />
                )}

                {showReducedAssignments && (
                  <Toggle onClick={(e) => handleAssignmentOpen(e, item.id)}>
                    <ChevronUp />
                  </Toggle>
                )}
              </div>
            )}
          </LineItemCard>
        );
      })}
    </>
  );
}
