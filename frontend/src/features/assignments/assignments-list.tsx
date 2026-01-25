import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFeatureFlag } from '@/context/FeatureFlagProvider';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getUserDisplayName } from '@/utils/user-display';
import Decimal from 'decimal.js';
import { Plus, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface AssignmentsListProps {
  possiblePeople: number[];
  onAddAssignment: (receiptUserId: number) => void;
  onRemoveAssignment: (receiptUserId: number) => void;
  item: ReceiptLineItem;
  formPricePerItem: Decimal;
  formQuantity: Decimal;
}

const AssignmentsList: React.FC<AssignmentsListProps> = ({
  possiblePeople,
  onAddAssignment,
  onRemoveAssignment,
  item,
  formPricePerItem,
  formQuantity,
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

  // Create a lookup map from receiptUserId to displayName using existing assignments
  const receiptUserIdToDisplayNameMap = useMemo(() => {
    const map = new Map<number, string>();
    item.assignments.forEach((assignment) => {
      map.set(assignment.receiptUserId, getUserDisplayName(assignment));
    });
    return map;
  }, [item.assignments]);

  // Helper to get display name for a receiptUserId, with fallback
  const getDisplayNameForReceiptUserId = (receiptUserId: number): string => {
    return receiptUserIdToDisplayNameMap.get(receiptUserId) ?? `User ${receiptUserId}`;
  };

  const handleAdd = (receiptUserId: number) => {
    onAddAssignment(receiptUserId);
    setNewPerson('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPersonSanitized) {
      // Try to parse as receiptUserId, or create new receipt user (would need backend support)
      const receiptUserId = parseInt(newPersonSanitized, 10);
      if (!isNaN(receiptUserId)) {
        handleAdd(receiptUserId);
      }
      // Note: Creating new receipt users by name would require backend API
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
                      onClick={() => onRemoveAssignment(receiptUserId)}
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
                  const receiptUserId = parseInt(newPersonSanitized, 10);
                  if (!isNaN(receiptUserId)) {
                    handleAdd(receiptUserId);
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
                    filteredReceiptUserIds.forEach((receiptUserId) => handleAdd(receiptUserId))
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
                    onClick={() => handleAdd(receiptUserId)}
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
