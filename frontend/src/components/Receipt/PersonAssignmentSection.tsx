import { MAX_VISIBLE_ASSIGNED_PEOPLE_DESKTOP } from '@/components/Receipt/constants';
import { getAvatarChipColors } from '@/components/Receipt/utils/avatar-chip-colors';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import { useMobile } from '@/hooks/useMobile';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getUserDisplayName } from '@/utils/user-display';
import React from 'react';

interface PersonAssignmentSectionProps {
  item: ReceiptLineItem;
  people: string[]; // ULID receipt user IDs
  receiptId: number;
  className?: string;
}

const PersonAssignmentSection: React.FC<PersonAssignmentSectionProps> = ({
  item,
  people,
  receiptId,
}) => {
  const isMobile = useMobile();
  const MAX_VISIBLE_ASSIGNED_PEOPLE = isMobile
    ? Infinity
    : MAX_VISIBLE_ASSIGNED_PEOPLE_DESKTOP;
  const visibleAssignments = item.assignments.slice(
    0,
    MAX_VISIBLE_ASSIGNED_PEOPLE
  );

  // If there are no visible assignments, show a "Add" message
  if (visibleAssignments.length === 0) {
    return (
      <div className="flex w-full justify-center">
        <p className="font-medium">Add</p>
      </div>
    );
  }

  const chipColors = getAvatarChipColors(receiptId, people);
  const overflowCount = item.assignments.length - MAX_VISIBLE_ASSIGNED_PEOPLE;

  return (
    <AvatarGroup>
      {visibleAssignments.map((assignment) => {
        const receiptUserId = assignment.receiptUserId;
        const displayName = getUserDisplayName(assignment);
        const c = chipColors.get(receiptUserId);

        return (
          <Avatar
            key={assignment.id}
            className={cn('ring-1', c?.ring)}
            title={displayName}
          >
            <AvatarFallback className={cn(c?.bg, c?.text)}>
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflowCount > 0 && (
        <AvatarGroupCount className="text-xs">
          +{overflowCount}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
};

export default PersonAssignmentSection;
