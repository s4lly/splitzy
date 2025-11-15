import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import React from 'react';

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
          aria-label={`Update ${label}`}
          title={`Update ${label}`}
          className="size-8"
        >
          <Pencil aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default EditableDetail;
