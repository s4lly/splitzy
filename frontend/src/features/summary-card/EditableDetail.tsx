import { useLingui } from '@lingui/react/macro';
import { Pencil } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

interface EditableDetailProps {
  label: string;
  value: string;
  onClick: () => void;
  className?: string;
}

const EditableDetail: React.FC<EditableDetailProps> = ({
  label,
  value,
  onClick,
  className = '',
}) => {
  const { t } = useLingui();

  return (
    <div
      className={`flex w-full items-center justify-between rounded-sm p-2 text-left sm:py-2 ${className}`}
    >
      <span className="text-base">{label}:</span>

      <div className="flex items-center gap-2">
        <span className="text-base font-medium">{value}</span>
        <Button
          onClick={onClick}
          variant="outline"
          type="button"
          aria-label={t`Update ${label}`}
          title={t`Update ${label}`}
          className="size-8"
        >
          <Pencil aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default EditableDetail;
