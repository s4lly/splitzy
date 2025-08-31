import React from 'react';
import PersonBadge from './PersonBadge';
import { LineItemSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { useMobile } from '@/hooks/use-mobile';
import clsx from 'clsx';
import { getColorForName } from './utils/get-color-for-name';
import { cn } from '@/lib/utils';

interface PersonAssignmentSectionProps {
  item: z.infer<typeof LineItemSchema>;
  people: string[];
  className?: string;
}

const PersonAssignmentSection: React.FC<PersonAssignmentSectionProps> = ({
  item,
  people,
  className = '',
}) => {
  const isMobile = useMobile();
  const MAX = isMobile ? Infinity : 3;
  const visibleAssignedPeople = item.assignments.slice(0, MAX);

  const classes = isMobile
    ? 'pt-2 border-t border-border/20'
    : 'flex flex-wrap gap-1 justify-center';

  return (
    <div className={`${classes} ${className}`}>
      {isMobile && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium">Assigned to:</span>
          {item.assignments.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center py-4 text-muted-foreground">
              <div className="text-sm font-medium">No one assigned yet</div>
              <div className="text-xs">Tap this card to assign people</div>
            </div>
          )}
        </div>
      )}

      {visibleAssignedPeople.length > 0 && (
        <div
          className={cn(
            'flex w-full items-center gap-2 rounded-full p-2',
            !isMobile && 'bg-gray-100'
          )}
        >
          {visibleAssignedPeople.map((person, personIdx) => {
            const [bgColor, textColor, hoverBgColor, hoverTextColor] =
              getColorForName(person, personIdx, people.length);

            return (
              <div
                key={personIdx}
                className={cn(
                  isMobile &&
                    'group flex items-center gap-1 rounded bg-muted/20 py-1',
                  !isMobile && '[&:nth-child(n+2)]:-ml-4'
                )}
              >
                <PersonBadge
                  name={person}
                  size={isMobile ? 'sm' : 'md'}
                  className={cn(
                    bgColor,
                    textColor,
                    !isMobile && 'border-2 border-white',
                    `dark:${hoverBgColor}`,
                    `dark:${hoverTextColor}`
                  )}
                />
              </div>
            );
          })}
          {item.assignments.length > MAX && (
            <div className="text-xs text-muted-foreground">
              +{item.assignments.length - MAX}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonAssignmentSection;
