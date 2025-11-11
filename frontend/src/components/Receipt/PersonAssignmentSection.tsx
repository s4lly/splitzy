import { useMobile } from '@/hooks/use-mobile';
import { LineItemSchema } from '@/lib/receiptSchemas';
import { cn } from '@/lib/utils';
import React from 'react';
import { z } from 'zod';
import PersonBadge from './PersonBadge';
import { MAX_VISIBLE_ASSIGNED_PEOPLE_DESKTOP } from './constants';
import {
  getColorForName,
  getSolidColorStyle,
} from './utils/get-color-for-name';

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
  const MAX_VISIBLE_ASSIGNED_PEOPLE = isMobile
    ? Infinity
    : MAX_VISIBLE_ASSIGNED_PEOPLE_DESKTOP;
  const visibleAssignedPeople = item.assignments.slice(
    0,
    MAX_VISIBLE_ASSIGNED_PEOPLE
  );

  if (visibleAssignedPeople.length > 0) {
    return (
      <>
        {visibleAssignedPeople.map((person, personIdx) => {
          // Use the person's index in the overall people array for consistent colors
          const personIndexInPeople = people.indexOf(person);
          const colorPair = getColorForName(
            person,
            personIndexInPeople,
            people.length
          );
          const colorStyle = getSolidColorStyle(colorPair);

          return (
            <PersonBadge
              key={personIdx}
              name={person}
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
