import React from "react";

interface ClickableRowProps {
  label: string;
  value: string;
  onClick: () => void;
  className?: string;
}

const ClickableRow: React.FC<ClickableRowProps> = ({
  label,
  value,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      className={`flex py-1 px-2 justify-between items-center sm:py-2 w-full text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm transition-colors ${className}`}
      onClick={onClick}
      aria-label={`Edit ${label.toLowerCase()}: ${value}`}
    >
      <span className="text-base">{label}:</span>
      <span className="text-base font-medium">{value}</span>
    </button>
  );
};

export default ClickableRow;
