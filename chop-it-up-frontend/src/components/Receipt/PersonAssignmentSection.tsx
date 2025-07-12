import React from "react";
import PersonBadge from "./PersonBadge";
import { LineItemSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { useMobile } from "@/hooks/use-mobile";
import clsx from "clsx";

interface PersonAssignmentSectionProps {
  item: z.infer<typeof LineItemSchema>;
  people: string[];
  className?: string;
}

const PersonAssignmentSection: React.FC<PersonAssignmentSectionProps> = ({
  item,
  people,
  className = "",
}) => {
  const isMobile = useMobile();

  const classes = isMobile
    ? "mt-2 pt-2 border-t border-border/20"
    : "flex flex-wrap gap-1 justify-center";

  return (
    <div className={`${classes} ${className}`}>
      {isMobile && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Assigned to:</span>
          {item.assignments.length === 0 && (
            <div className="flex flex-col justify-center items-center h-full text-muted-foreground py-4">
              <div className="text-sm font-medium">No one assigned yet</div>
              <div className="text-xs">Tap this card to assign people</div>
            </div>
          )}
        </div>
      )}

      {people.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.assignments.map((person, personIdx) => (
            <div
              key={personIdx}
              className={clsx(
                isMobile &&
                  "flex items-center gap-1 bg-muted/20 rounded py-1 px-2 group"
              )}
            >
              <PersonBadge
                name={person}
                personIndex={people.indexOf(person)}
                totalPeople={people.length}
                size="sm"
              />
              <span className="text-xs">{person}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonAssignmentSection;
