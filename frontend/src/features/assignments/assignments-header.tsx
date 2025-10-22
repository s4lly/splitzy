import { Toggle } from '@/components/ui/toggle';
import { ChevronDown } from 'lucide-react';
import React from 'react';

interface AssignmentsHeaderProps {
  onAssignmentCancel: () => void;
}

export const AssignmentsHeader: React.FC<AssignmentsHeaderProps> = ({
  onAssignmentCancel,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-border/40 p-2">
      <div className="font-medium">Assigned to:</div>
      <Toggle
        pressed
        onClick={onAssignmentCancel}
        aria-label="Close assignments"
      >
        <ChevronDown />
      </Toggle>
    </div>
  );
};
