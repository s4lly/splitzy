import { AssignmentsContainer } from '@/features/assignments/assignments-container';
import { AssignmentsHeader } from '@/features/assignments/assignments-header';
import AssignmentsList from '@/features/assignments/assignments-list';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';
import { ChevronUp, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Toggle } from '../ui/toggle';
import LineItemEditForm from './LineItemEditForm';
import PersonAssignmentSection from './PersonAssignmentSection';
import LineItemCard from './components/LineItemCard';
import { useLineItemDeleteMutation } from './hooks/useLineItemDeleteMutation';
import { formatCurrency } from './utils/format-currency';
import { calculations } from './utils/receipt-calculation';

export default function LineItemsTableMobile({
  line_items,
  result,
  people,
  togglePersonAssignment,
}: {
  line_items: z.infer<typeof LineItemSchema>[];
  result: z.infer<typeof ReceiptSchema>;
  people: string[];
  togglePersonAssignment: (itemId: string, person: string) => void;
}) {
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [assignmentItemId, setAssignmentItemId] = useState<string | null>(null);

  const { mutate: deleteItem } = useLineItemDeleteMutation();

  // Edit mode handlers
  const handleEditOpen = (e: React.MouseEvent, itemId: string) => {
    setEditItemId(itemId);
    setAssignmentItemId(null);

    e.stopPropagation();
  };

  // Assignment list handlers
  const handleAssignmentOpen = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setEditItemId(null);

    setAssignmentItemId((prevItemId) =>
      prevItemId === itemId ? null : itemId
    );
  };

  const handleEditClose = () => {
    setEditItemId(null);
    setAssignmentItemId(null);
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem(
      {
        receiptId: String(result?.id),
        itemId: itemId,
      },
      {
        onSuccess: () => {
          handleEditClose();
        },
      }
    );
  };

  return (
    <>
      {line_items.map((item) => {
        const showReducedDetails = assignmentItemId === item.id;
        const showReducedAssignments = editItemId === item.id;

        return (
          <LineItemCard
            key={item.id}
            selected={showReducedAssignments || showReducedDetails}
          >
            {/* line item details */}
            {showReducedAssignments ? (
              // edit
              <LineItemEditForm
                item={item}
                result={result}
                onEditCancel={handleEditClose}
              />
            ) : (
              // view
              <>
                <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 p-2">
                  <span className="text-base font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="text-right font-semibold">
                      {formatCurrency(
                        calculations.pretax.getIndividualItemTotalPrice(item)
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
            {showReducedDetails ? (
              // edit
              <>
                <AssignmentsHeader onAssignmentCancel={handleEditClose} />
                <AssignmentsList
                  possiblePeople={people}
                  onAddAssignment={(person) =>
                    togglePersonAssignment(item.id, person)
                  }
                  onRemoveAssignment={(person) =>
                    togglePersonAssignment(item.id, person)
                  }
                  item={item}
                  formPricePerItem={new Decimal(item.price_per_item)}
                  formQuantity={new Decimal(item.quantity)}
                />
              </>
            ) : (
              // view
              <div
                className={cn(
                  'flex p-2',
                  showReducedAssignments
                    ? 'justify-between gap-2 border-t border-border/40'
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
                  <AssignmentsContainer>
                    <PersonAssignmentSection
                      className={cn(showReducedAssignments && 'justify-end')}
                      item={item}
                      people={people}
                    />
                  </AssignmentsContainer>
                )}

                {showReducedAssignments && (
                  <Toggle onClick={(e) => handleAssignmentOpen(e, item.id)}>
                    <ChevronUp />
                  </Toggle>
                )}
              </div>
            )}

            <Separator />

            {(showReducedAssignments || showReducedDetails) && (
              <div className="flex justify-between p-2 pt-3">
                <Button
                  onClick={() => handleDeleteItem(item.id)}
                  variant="outline"
                  className="border-red-500 text-red-500"
                >
                  Delete
                </Button>
                <Button onClick={handleEditClose} variant="outline">
                  Done
                </Button>
              </div>
            )}
          </LineItemCard>
        );
      })}
    </>
  );
}
