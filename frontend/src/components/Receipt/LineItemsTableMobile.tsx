// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import { ChevronUp, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import LineItemCard from '@/components/Receipt/components/LineItemCard';
import LineItemEditForm from '@/components/Receipt/LineItemEditForm';
import PersonAssignmentSection from '@/components/Receipt/PersonAssignmentSection';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { AssignmentsContainer } from '@/features/assignments/assignments-container';
import { AssignmentsHeader } from '@/features/assignments/assignments-header';
import AssignmentsList from '@/features/assignments/assignments-list';
import type {
  DeleteLineItemData,
  MutationCallbackOptions,
  UpdateLineItemData,
} from '@/features/line-items/types';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/models/Assignment';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function LineItemsTableMobile({
  // --- Data ---
  line_items,
  receipt,
  people,
  allAssignments,
  // --- Assignment Callbacks ---
  addExistingPersonAssignment,
  addNewPersonAssignment,
  removePersonAssignment,
  // --- Line Item Callbacks ---
  onUpdateLineItem,
  onDeleteLineItem,
  isDeleting,
}: {
  line_items: readonly ReceiptLineItem[];
  receipt: Receipt;
  people: string[]; // ULID receipt user IDs
  allAssignments?: readonly Assignment[];
  addExistingPersonAssignment: (itemId: string, receiptUserId: string) => void;
  addNewPersonAssignment: (itemId: string, displayName: string) => void;
  removePersonAssignment: (itemId: string, assignmentId: string) => void;
  onUpdateLineItem: (data: UpdateLineItemData) => void;
  onDeleteLineItem: (
    data: DeleteLineItemData,
    options?: MutationCallbackOptions
  ) => void;
  isDeleting?: boolean;
}) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [assignmentItemId, setAssignmentItemId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleEditOpen = (e: React.MouseEvent, itemId: string) => {
    setEditItemId(itemId);
    setAssignmentItemId(null);
    e.stopPropagation();
  };

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
    onDeleteLineItem(
      {
        receiptId: String(receipt.id),
        itemId: itemId,
      },
      {
        onSuccess: () => {
          handleEditClose();
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {line_items.map((item) => {
        // Derived state for this item
        const showReducedDetails = assignmentItemId === item.id;
        const showReducedAssignments = editItemId === item.id;

        return (
          <LineItemCard
            key={item.id}
            selected={showReducedAssignments || showReducedDetails}
          >
            {/* ========================= LINE ITEM DETAILS ========================= */}
            {showReducedAssignments ? (
              // --- Edit Mode ---
              <LineItemEditForm
                item={item}
                receipt={receipt}
                onEditCancel={handleEditClose}
                onUpdateLineItem={onUpdateLineItem}
              />
            ) : (
              // --- View Mode ---
              <>
                {/* Header: Name + Price + Edit Toggle */}
                <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 p-2">
                  <span className="text-base font-medium">
                    {item.name ?? '(Unnamed item)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="text-right font-semibold">
                      {formatCurrency(
                        calculations.pretax.getIndividualItemTotalPrice(item)
                      )}
                    </div>

                    <Toggle
                      onClick={(e) => handleEditOpen(e, item.id)}
                      aria-expanded={showReducedAssignments}
                      aria-label={
                        showReducedAssignments
                          ? 'Collapse edit'
                          : `Edit ${item.name ?? 'item'}`
                      }
                    >
                      {!showReducedAssignments ? (
                        <Pencil aria-hidden />
                      ) : (
                        <ChevronUp aria-hidden />
                      )}
                    </Toggle>
                  </div>
                </div>

                {/* Details: Quantity + Unit Price (hidden when assignments expanded) */}
                {!showReducedDetails && (
                  <div className="flex flex-col gap-2 p-2">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="flex-1 text-right text-base font-medium">
                        {item.quantity.toNumber()}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="flex-1 text-right text-base font-medium">
                        {formatCurrency(item.pricePerItem)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============================ ASSIGNMENTS ============================ */}
            {showReducedDetails ? (
              // --- Edit Mode ---
              <>
                <AssignmentsHeader onAssignmentCancel={handleEditClose} />
                <AssignmentsList
                  receiptId={receipt.id}
                  possiblePeople={people}
                  onAddExistingPerson={(receiptUserId) =>
                    addExistingPersonAssignment(item.id, receiptUserId)
                  }
                  onAddNewPerson={(displayName) =>
                    addNewPersonAssignment(item.id, displayName)
                  }
                  onRemoveAssignment={(assignmentId) =>
                    removePersonAssignment(item.id, assignmentId)
                  }
                  item={item}
                  formPricePerItem={item.pricePerItem}
                  formQuantity={item.quantity}
                  allAssignments={allAssignments}
                />
              </>
            ) : (
              // --- View Mode ---
              <div
                className={cn(
                  'flex p-2',
                  showReducedAssignments
                    ? 'justify-between gap-2 border-t border-border/40'
                    : 'flex-col'
                )}
              >
                {/* Label + Toggle */}
                <div className={cn('flex items-center justify-between')}>
                  <span className="text-nowrap text-sm font-medium">
                    Assigned to:
                  </span>

                  {!showReducedAssignments && (
                    <Toggle
                      onClick={(e) => handleAssignmentOpen(e, item.id)}
                      aria-expanded={showReducedDetails}
                      aria-label={
                        item.assignments.length === 0
                          ? `Assign ${item.name ?? 'item'}`
                          : `Manage assignments for ${item.name ?? 'item'}`
                      }
                    >
                      {item.assignments.length === 0 ? (
                        <Plus aria-hidden />
                      ) : (
                        <Pencil aria-hidden />
                      )}
                    </Toggle>
                  )}
                </div>

                {/* Assignment Badges */}
                {item.assignments.length > 0 && (
                  <AssignmentsContainer>
                    <PersonAssignmentSection
                      className={cn(showReducedAssignments && 'justify-end')}
                      item={item}
                      people={people}
                      receiptId={receipt.id}
                    />
                  </AssignmentsContainer>
                )}

                {/* Collapse Toggle (when in edit mode) */}
                {showReducedAssignments && (
                  <Toggle
                    onClick={(e) => handleAssignmentOpen(e, item.id)}
                    aria-expanded={showReducedDetails}
                    aria-label="Collapse assignments"
                  >
                    <ChevronUp aria-hidden />
                  </Toggle>
                )}
              </div>
            )}

            {/* ========================== CARD FOOTER ========================== */}
            <Separator />

            {/* Action Buttons (only visible when expanded) */}
            {(showReducedAssignments || showReducedDetails) && (
              <div className="flex justify-between p-2 pt-3">
                <Button
                  onClick={() => handleDeleteItem(item.id)}
                  variant="outline"
                  className="border-red-500 text-red-500"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
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
