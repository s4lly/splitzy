import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFeatureFlag } from '@/context/FeatureFlagProvider';
import type { Assignment } from '@/models/Assignment';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getReceiptUserDisplayName, getUserDisplayName } from '@/utils/user-display';
import Decimal from 'decimal.js';
import { Plus, X } from 'lucide-react';
import React, { useState } from 'react';

interface AssignmentsListProps {
  possiblePeople: string[]; // ULID receipt user IDs
  onAddExistingPerson: (receiptUserId: string) => void;
  onAddNewPerson: (displayName: string) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  item: ReceiptLineItem;
  formPricePerItem: Decimal;
  formQuantity: Decimal;
  allAssignments?: readonly Assignment[]; // All assignments across the receipt (optional)
}

const AssignmentsList: React.FC<AssignmentsListProps> = ({
  possiblePeople,
  onAddExistingPerson,
  onAddNewPerson,
  onRemoveAssignment,
  item,
  formPricePerItem,
  formQuantity,
  allAssignments,
}) => {
  const [newPerson, setNewPerson] = useState('');
  const newPersonSanitized = newPerson.trim();
  const assignmentsAddAllEnabled = useFeatureFlag('assignments-add-all');

  const assignedReceiptUserIds = item.assignments.map((a) => a.receiptUserId);
  const filteredReceiptUserIds = calculations.utils.filterPeople(
    possiblePeople,
    assignedReceiptUserIds,
    newPersonSanitized
  );

  // Helper to get display name for a receiptUserId
  // Uses all assignments across receipt if available, otherwise falls back to item's assignments
  const getDisplayNameForReceiptUserId = (receiptUserId: string): string => {
    const assignmentsToUse = allAssignments ?? item.assignments;
    const assignment = assignmentsToUse.find(
      (a) => a.receiptUserId === receiptUserId
    );
    return getReceiptUserDisplayName(
      assignment?.receiptUser ?? null,
      receiptUserId
    );
  };

  const handleAddExisting = (receiptUserId: string) => {
    onAddExistingPerson(receiptUserId);
    setNewPerson('');
  };

  const handleAddNew = (displayName: string) => {
    onAddNewPerson(displayName);
    setNewPerson('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPersonSanitized) {
      // Check if input matches an existing receiptUserId (ULID)
      if (possiblePeople.includes(newPersonSanitized)) {
        handleAddExisting(newPersonSanitized);
      } else {
        // Create new receipt user with the entered name
        handleAddNew(newPersonSanitized);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-md p-2 md:flex-row">
      {/* assigned list */}
      <div className="flex flex-1 flex-col gap-2">
        {item.assignments.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No one assigned yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {item.assignments.map((assignment) => {
              const receiptUserId = assignment.receiptUserId;
              const displayName = getUserDisplayName(assignment);
              return (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between rounded bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center">
                    <span>{displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      {formatCurrency(
                        calculations.pretax.getPersonTotalForItem(
                          item,
                          receiptUserId,
                          {
                            candidate: {
                              pricePerItem: formPricePerItem,
                              quantity: formQuantity,
                            },
                          }
                        )
                      )}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={() => onRemoveAssignment(assignment.id)}
                      aria-label={`Remove ${displayName}`}
                      title={`Remove ${displayName}`}
                    >
                      <X />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* assign new */}
      <div className="flex-1 space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-item-assignment" className="font-semibold">
            New:
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="new-item-assignment"
              type="text"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter name..."
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (newPersonSanitized) {
                  // Check if input matches an existing receiptUserId (ULID)
                  if (possiblePeople.includes(newPersonSanitized)) {
                    handleAddExisting(newPersonSanitized);
                  } else {
                    handleAddNew(newPersonSanitized);
                  }
                }
              }}
              disabled={!newPersonSanitized}
            >
              Create
            </Button>
          </div>
        </div>
        <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
          {assignmentsAddAllEnabled &&
            filteredReceiptUserIds.length > 0 &&
            newPersonSanitized === '' && (
              <div className="mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    filteredReceiptUserIds.forEach((receiptUserId) =>
                      handleAddExisting(receiptUserId)
                    )
                  }
                  disabled={filteredReceiptUserIds.length === 0}
                  className="w-full"
                >
                  Assign All
                </Button>
              </div>
            )}
          {filteredReceiptUserIds.length === 0 ? (
            <div className="text-center">
              {newPersonSanitized ? (
                <li className="text-sm text-muted-foreground">
                  No matching people. Press Enter to add.
                </li>
              ) : (
                <li className="text-sm text-muted-foreground">
                  All people assigned.
                </li>
              )}
            </div>
          ) : (
            filteredReceiptUserIds.map((receiptUserId) => {
              const displayName = getDisplayNameForReceiptUserId(receiptUserId);
              return (
                <li
                  key={receiptUserId}
                  className="flex items-center justify-between gap-2 rounded border-b bg-muted/10 pb-2 last-of-type:border-b-0"
                >
                  <span>{displayName}</span>
                  <Button
                    variant="outline"
                    onClick={() => handleAddExisting(receiptUserId)}
                    className="size-8 rounded-full"
                    aria-label={`Assign ${displayName}`}
                    title={`Assign ${displayName}`}
                  >
                    <Plus />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default AssignmentsList;
