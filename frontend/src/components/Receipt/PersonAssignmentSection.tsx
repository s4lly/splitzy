import { useMobile } from '@/hooks/use-mobile';
import { LineItemSchema } from '@/lib/receiptSchemas';
import { cn } from '@/lib/utils';
import React from 'react';
import { z } from 'zod';
import PersonBadge from './PersonBadge';
import { getColorForName, getColorStyle } from './utils/get-color-for-name';

interface PersonAssignmentSectionProps {
  item: z.infer<typeof LineItemSchema>;
  people: string[];
  className?: string;
}

const PersonAssignmentSection: React.FC<PersonAssignmentSectionProps> = ({
  item,
  people,
}) => {
  const isMobile = useMobile();
  const MAX_VISIBLE_ASSIGNED_PEOPLE = isMobile ? Infinity : 3;
  const visibleAssignedPeople = item.assignments.slice(
    0,
    MAX_VISIBLE_ASSIGNED_PEOPLE
  );

  if (visibleAssignedPeople.length === 0) return null;

  return (
    <>
      {visibleAssignedPeople.map((person, personIdx) => {
        const colorPair = getColorForName(person, personIdx, people.length);
        const colorStyle = getColorStyle(colorPair);

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
              colorStyle={colorStyle}
              className={cn(!isMobile && 'border-2 border-white')}
            />
          </div>
        );
      })}

      {item.assignments.length > MAX_VISIBLE_ASSIGNED_PEOPLE && (
        <div className="text-xs text-muted-foreground">
          +{item.assignments.length - MAX_VISIBLE_ASSIGNED_PEOPLE}
        </div>
      )}
    </>
  );
};

export default PersonAssignmentSection;
