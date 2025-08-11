import React from "react";
import PersonBadge from "./PersonBadge";
import { LineItemSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { useMobile } from "@/hooks/use-mobile";
import clsx from "clsx";
import { getColorForName } from "./utils/get-color-for-name";
import { cn } from "@/lib/utils";

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
  const MAX = isMobile ? Infinity : 3;
  const visibleAssignedPeople = item.assignments.slice(0, MAX);

  const classes = isMobile
    ? "pt-2 border-t border-border/20"
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

      {visibleAssignedPeople.length > 0 && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-full w-full p-2",
            !isMobile && "bg-gray-100"
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
                    "flex items-center gap-1 bg-muted/20 rounded py-1 group",
                  !isMobile && "[&:nth-child(n+2)]:-ml-4"
                )}
              >
                <PersonBadge
                  name={person}
                  size={isMobile ? "sm" : "md"}
                  className={cn(
                    bgColor,
                    textColor,
                    !isMobile && "border-white border-2",
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
