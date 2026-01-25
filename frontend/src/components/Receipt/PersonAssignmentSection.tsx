import { useMobile } from '@/hooks/useMobile';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
import { getUserDisplayName } from '@/utils/user-display';
import { cn } from '@/lib/utils';
import React from 'react';
import PersonBadge from './PersonBadge';
import { MAX_VISIBLE_ASSIGNED_PEOPLE_DESKTOP } from './constants';
import {
  getColorForName,
  getSolidColorStyle,
} from './utils/get-color-for-name';

interface PersonAssignmentSectionProps {
  item: ReceiptLineItem;
  people: string[]; // ULID receipt user IDs
  className?: string;
}

const PersonAssignmentSection: React.FC<PersonAssignmentSectionProps> = ({
  item,
  people,
}) => {
  const isMobile = useMobile();
  const MAX_VISIBLE_ASSIGNED_PEOPLE = isMobile
    ? Infinity
    : MAX_VISIBLE_ASSIGNED_PEOPLE_DESKTOP;
  const visibleAssignments = item.assignments.slice(
    0,
    MAX_VISIBLE_ASSIGNED_PEOPLE
  );

  if (visibleAssignments.length > 0) {
    return (
      <>
        {visibleAssignments.map((assignment, personIdx) => {
          const receiptUserId = assignment.receiptUserId;
          const displayName = getUserDisplayName(assignment);
          // Use the receiptUserId's index in the overall people array for consistent colors
          const personIndex = people.indexOf(receiptUserId);
          const normalizedIndex =
            people.length > 0
              ? (personIndex >= 0 ? personIndex : personIdx) % people.length
              : 0;

          const colorPair = getColorForName(
            receiptUserId,
            normalizedIndex,
            people.length
          );
          const colorStyle = getSolidColorStyle(colorPair);

          return (
            <PersonBadge
              key={assignment.id}
              name={displayName}
              size={isMobile ? 'sm' : 'md'}
              colorStyle={colorStyle}
              className={cn(
                isMobile &&
                  'group flex items-center gap-1 rounded-full bg-muted/20 py-1',
                !isMobile && 'border-2 border-white',
                !isMobile && personIdx > 0 && '-ml-4'
              )}
            />
          );
        })}

        {item.assignments.length > MAX_VISIBLE_ASSIGNED_PEOPLE && (
          <div className="text-xs text-muted-foreground">
            +{item.assignments.length - MAX_VISIBLE_ASSIGNED_PEOPLE}
          </div>
        )}
      </>
    );
  } else {
    return (
      <div className="flex w-full justify-center">
        <p className="font-medium">Add</p>
      </div>
    );
  }
};

export default PersonAssignmentSection;
