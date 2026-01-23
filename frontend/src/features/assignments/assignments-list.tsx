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
  onAddAssignment: (userId: number) => void;
  onRemoveAssignment: (userId: number) => void;
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

  const assignedUserIds = item.assignments.map((a) => a.userId);
  const filteredUserIds = calculations.utils.filterPeople(
    possiblePeople,
    assignedUserIds,
    newPersonSanitized
  );

  // Create a lookup map from userId to displayName using existing assignments
  const userIdToDisplayNameMap = useMemo(() => {
    const map = new Map<number, string>();
    item.assignments.forEach((assignment) => {
      map.set(assignment.userId, getUserDisplayName(assignment));
    });
    return map;
  }, [item.assignments]);

  // Helper to get display name for a userId, with fallback
  const getDisplayNameForUserId = (userId: number): string => {
    return userIdToDisplayNameMap.get(userId) ?? `User ${userId}`;
  };

  const handleAdd = (userId: number) => {
    onAddAssignment(userId);
    setNewPerson('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPersonSanitized) {
      // Try to parse as userId, or create new user (would need backend support)
      const userId = parseInt(newPersonSanitized, 10);
      if (!isNaN(userId)) {
        handleAdd(userId);
      }
      // Note: Creating new users by name would require backend API
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
              const userId = assignment.userId;
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
                          userId,
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
                      onClick={() => onRemoveAssignment(userId)}
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
                  const userId = parseInt(newPersonSanitized, 10);
                  if (!isNaN(userId)) {
                    handleAdd(userId);
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
            filteredUserIds.length > 0 &&
            newPersonSanitized === '' && (
              <div className="mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    filteredUserIds.forEach((userId) => handleAdd(userId))
                  }
                  disabled={filteredUserIds.length === 0}
                  className="w-full"
                >
                  Assign All
                </Button>
              </div>
            )}
          {filteredUserIds.length === 0 ? (
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
            filteredUserIds.map((userId) => {
              const displayName = getDisplayNameForUserId(userId);
              return (
                <li
                  key={userId}
                  className="flex items-center justify-between gap-2 rounded border-b bg-muted/10 pb-2 last-of-type:border-b-0"
                >
                  <span>{displayName}</span>
                  <Button
                    variant="outline"
                    onClick={() => handleAdd(userId)}
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
