import { useAuth } from '@clerk/clerk-react';
import Decimal from 'decimal.js';
import { Check, HandGrab, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

import {
  DEFAULT_CHIP_COLOR,
  getAvatarChipColors,
} from '@/components/Receipt/utils/avatar-chip-colors';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Avatar, AvatarBadge, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFeatureFlag } from '@/context/FeatureFlagProvider';
import { ClaimReceiptUserDialog } from '@/features/assignments/ClaimReceiptUserDialog';
import { SignInToClaimDialog } from '@/features/assignments/SignInToClaimDialog';
import { SwitchReceiptUserDialog } from '@/features/assignments/SwitchReceiptUserDialog';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/models/Assignment';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import {
  getReceiptUserDisplayName,
  getUserDisplayName,
} from '@/utils/user-display';

interface AssignmentsListProps {
  receiptId: number;
  possiblePeople: string[]; // ULID receipt user IDs
  onAddExistingPerson: (receiptUserId: string) => void;
  onAddNewPerson: (displayName: string) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  item: ReceiptLineItem;
  formPricePerItem: Decimal;
  formQuantity: Decimal;
  allAssignments?: readonly Assignment[]; // All assignments across the receipt (optional)
}

type AvatarAction =
  | { type: 'claim' }
  | { type: 'sign-in' }
  | {
      type: 'switch';
      previousReceiptUserId: string;
      previousDisplayName: string;
    }
  | null;

function getAvatarAction(
  assignment: Assignment,
  allAssignments: readonly Assignment[] | undefined,
  clerkUserId: string | null | undefined
): AvatarAction {
  if (assignment.receiptUser?.userId != null) return null;
  if (clerkUserId == null) return { type: 'sign-in' };

  const assignments = allAssignments ?? [];
  const currentUserClaimed = assignments.find(
    (a) => a.receiptUser?.user?.authUserId === clerkUserId
  );

  if (currentUserClaimed == null) return { type: 'claim' };
  return {
    type: 'switch',
    previousReceiptUserId: currentUserClaimed.receiptUserId,
    previousDisplayName: getUserDisplayName(currentUserClaimed),
  };
}

const AssignmentsList: React.FC<AssignmentsListProps> = ({
  receiptId,
  possiblePeople,
  onAddExistingPerson,
  onAddNewPerson,
  onRemoveAssignment,
  item,
  formPricePerItem,
  formQuantity,
  allAssignments,
}) => {
  const { userId: clerkUserId } = useAuth();
  const [newPerson, setNewPerson] = useState('');
  const [claimTarget, setClaimTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [signInTarget, setSignInTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [switchTarget, setSwitchTarget] = useState<{
    previousId: string;
    previousName: string;
    newId: string;
    newName: string;
  } | null>(null);
  const newPersonSanitized = newPerson.trim();
  const assignmentsAddAllEnabled = useFeatureFlag('assignments-add-all');

  const assignedReceiptUserIds = item.assignments.map((a) => a.receiptUserId);
  const filteredReceiptUserIds = calculations.utils.filterPeople(
    possiblePeople,
    assignedReceiptUserIds,
    newPersonSanitized
  );

  const chipColors = getAvatarChipColors(receiptId, possiblePeople);

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
    <>
      {claimTarget !== null && (
        <ClaimReceiptUserDialog
          open={claimTarget !== null}
          onOpenChange={(open) => !open && setClaimTarget(null)}
          receiptUserId={claimTarget.id}
          displayName={claimTarget.name}
        />
      )}
      {signInTarget !== null && (
        <SignInToClaimDialog
          open={signInTarget !== null}
          onOpenChange={(open) => !open && setSignInTarget(null)}
          displayName={signInTarget.name}
        />
      )}
      {switchTarget !== null && (
        <SwitchReceiptUserDialog
          open={switchTarget !== null}
          onOpenChange={(open) => !open && setSwitchTarget(null)}
          previousReceiptUser={{
            id: switchTarget.previousId,
            name: switchTarget.previousName,
          }}
          newReceiptUser={{
            id: switchTarget.newId,
            name: switchTarget.newName,
          }}
          receiptId={receiptId}
          possiblePeople={possiblePeople}
        />
      )}
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
                const c = chipColors.get(receiptUserId) || DEFAULT_CHIP_COLOR;
                const action = getAvatarAction(
                  assignment,
                  allAssignments,
                  clerkUserId
                );

                return (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between bg-muted/30 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {action !== null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-full p-0"
                          onClick={() => {
                            if (action.type === 'claim') {
                              setClaimTarget({
                                id: receiptUserId,
                                name: displayName,
                              });
                            } else if (action.type === 'sign-in') {
                              setSignInTarget({
                                id: receiptUserId,
                                name: displayName,
                              });
                            } else {
                              setSwitchTarget({
                                previousId: action.previousReceiptUserId,
                                previousName: action.previousDisplayName,
                                newId: receiptUserId,
                                newName: displayName,
                              });
                            }
                          }}
                          aria-label={
                            action.type === 'sign-in'
                              ? `Sign in to claim ${displayName}`
                              : action.type === 'switch'
                                ? `Switch to ${displayName}`
                                : `Claim ${displayName}`
                          }
                          title={
                            action.type === 'sign-in'
                              ? `Sign in to claim ${displayName}`
                              : action.type === 'switch'
                                ? `Switch to ${displayName}`
                                : `Claim ${displayName}`
                          }
                        >
                          <Avatar
                            key={assignment.id}
                            className={cn('ring-1', c.ring)}
                            title={displayName}
                          >
                            <AvatarFallback className={cn(c.bg, c.text)}>
                              <HandGrab />
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      ) : (
                        <Avatar
                          key={assignment.id}
                          className={cn(
                            'ring-1',
                            c.ring,
                            assignment.receiptUser?.user?.authUserId ===
                              clerkUserId && 'overflow-visible'
                          )}
                          title={displayName}
                        >
                          <AvatarFallback className={cn(c.bg, c.text)}>
                            {getInitials(displayName)}
                          </AvatarFallback>
                          {assignment.receiptUser?.user?.authUserId ===
                            clerkUserId && (
                            <AvatarBadge
                              className="bg-green-600 text-white ring-2 ring-background dark:bg-green-700 dark:text-white"
                              aria-label="Linked to your account"
                            >
                              <Check className="size-2.5" aria-hidden />
                            </AvatarBadge>
                          )}
                        </Avatar>
                      )}
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
                <li className="mb-2">
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
                </li>
              )}
            {filteredReceiptUserIds.length === 0 ? (
              <li>
                <div className="text-center">
                  {newPersonSanitized ? (
                    <span className="text-sm text-muted-foreground">
                      No matching people. Press Enter to add.
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      All people assigned.
                    </span>
                  )}
                </div>
              </li>
            ) : (
              filteredReceiptUserIds.map((receiptUserId) => {
                const displayName =
                  getDisplayNameForReceiptUserId(receiptUserId);

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
    </>
  );
};

export default AssignmentsList;
