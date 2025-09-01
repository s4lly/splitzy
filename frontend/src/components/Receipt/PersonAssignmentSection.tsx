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

  if (visibleAssignedPeople.length === 0) return null;

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-full',
        !isMobile && 'bg-gray-100 p-2',
        className
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
  );
};

export default PersonAssignmentSection;
