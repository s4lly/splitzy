import React from 'react';
import { Plus } from "lucide-react";
import { Button } from "../../ui/button";

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
    <div className={`flex gap-2 justify-between items-center border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2 ${className}`}>
      <span className="text-base">{label}:</span>
      <Button
        onClick={onClick}
        variant="outline"
        className="size-8"
      >
        <Plus />
      </Button>
    </div>
  );
};

export default AddableRow;
