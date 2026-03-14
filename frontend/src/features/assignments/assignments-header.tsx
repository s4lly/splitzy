import { Trans, useLingui } from '@lingui/react/macro';
import { ChevronDown } from 'lucide-react';
import React from 'react';

import { Toggle } from '@/components/ui/toggle';

interface AssignmentsHeaderProps {
  onAssignmentCancel: () => void;
}

export const AssignmentsHeader: React.FC<AssignmentsHeaderProps> = ({
  onAssignmentCancel,
}) => {
  const { t } = useLingui();

  return (
    <div className="flex items-center justify-between border-b border-border/40 p-2">
      <div className="font-medium">
        <Trans>Assigned to:</Trans>
      </div>
      <Toggle
        pressed
        onClick={onAssignmentCancel}
        aria-label={t`Close assignments`}
      >
        <ChevronDown />
      </Toggle>
    </div>
  );
};
