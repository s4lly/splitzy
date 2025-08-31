import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/button';

interface AddableRowProps {
  label: string;
  onClick: () => void;
  className?: string;
}

const AddableRow: React.FC<AddableRowProps> = ({
  label,
  onClick,
  className = '',
}) => {
  return (
    <div
      className={`-ml-2 -mr-2 flex items-center justify-between gap-2 rounded-sm border p-2 px-2 py-1 ${className}`}
    >
      <span className="text-base">{label}:</span>
      <Button
        onClick={onClick}
        variant="outline"
        type="button"
        aria-label={`Add ${label}`}
        title={`Add ${label}`}
        className="size-8"
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
};

export default AddableRow;
