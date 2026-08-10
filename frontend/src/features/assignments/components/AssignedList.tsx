import { useAuth } from '@clerk/react-router';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { Check, HandGrab, X } from 'lucide-react';
import React from 'react';

import {
  DEFAULT_CHIP_COLOR,
  getAvatarChipColors,
} from '@/components/Receipt/utils/avatar-chip-colors';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Avatar, AvatarBadge, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/models/Assignment';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getUserDisplayName } from '@/utils/user-display';

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

  const assignments = (allAssignments ?? []).filter((a) => !a.deletedAt);
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

interface AssignedListProps {
  receiptId: number;
  possiblePeople: string[];
  item: ReceiptLineItem;
  formPricePerItem: Decimal;
  formQuantity: Decimal;
  allAssignments?: readonly Assignment[];
  onRemoveAssignment: (assignmentId: string) => void;
  onClaimAction: (receiptUserId: string, displayName: string) => void;
  onSignInAction: (receiptUserId: string, displayName: string) => void;
  onSwitchAction: (
    previousReceiptUserId: string,
    previousDisplayName: string,
    newReceiptUserId: string,
    newDisplayName: string
  ) => void;
}

const AssignedList: React.FC<AssignedListProps> = ({
  receiptId,
  possiblePeople,
  item,
  formPricePerItem,
  formQuantity,
  allAssignments,
  onRemoveAssignment,
  onClaimAction,
  onSignInAction,
  onSwitchAction,
}) => {
  const { t } = useLingui();
  const { userId: clerkUserId } = useAuth();
  const chipColors = getAvatarChipColors(receiptId, possiblePeople);
  const activeAssignments = item.assignments.filter((a) => !a.deletedAt);

  return (
    <div className="flex flex-1 flex-col gap-2">
      {activeAssignments.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          <Trans>No one assigned yet.</Trans>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {activeAssignments.map((assignment) => {
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
                          onClaimAction(receiptUserId, displayName);
                        } else if (action.type === 'sign-in') {
                          onSignInAction(receiptUserId, displayName);
                        } else {
                          onSwitchAction(
                            action.previousReceiptUserId,
                            action.previousDisplayName,
                            receiptUserId,
                            displayName
                          );
                        }
                      }}
                      aria-label={
                        action.type === 'sign-in'
                          ? t`Sign in to claim ${displayName}`
                          : action.type === 'switch'
                            ? t`Switch to ${displayName}`
                            : t`Claim ${displayName}`
                      }
                      title={
                        action.type === 'sign-in'
                          ? t`Sign in to claim ${displayName}`
                          : action.type === 'switch'
                            ? t`Switch to ${displayName}`
                            : t`Claim ${displayName}`
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
                          aria-label={t`Linked to your account`}
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
                    aria-label={t`Remove ${displayName}`}
                    title={t`Remove ${displayName}`}
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
  );
};

export default AssignedList;
