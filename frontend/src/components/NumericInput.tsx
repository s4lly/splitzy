import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NumericInputProps {
  /** The current numeric value */
  value: number;
  /** Callback function called when the value changes */
  onChange: (value: number) => void;
  /** Minimum allowed value (default: 1) */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Placeholder text displayed in the input */
  placeholder?: string;
  /** Additional CSS classes to apply to the container */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** HTML id attribute for the input element (for label association) */
  id?: string;
}

/**
 * A numeric input component with increment/decrement buttons.
 * Allows users to input or adjust a numeric value using the input field
 * or the +/- buttons. Values are automatically constrained to min/max bounds.
 *
 * @param props - The component props
 * @returns A numeric input with increment/decrement controls
 */
export default function NumericInput({
  value,
  onChange,
  min = 1,
  max,
  placeholder = 'Quantity',
  className = '',
  disabled = false,
  id,
}: NumericInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const newValue = Number.isFinite(raw)
      ? max !== undefined
        ? Math.min(max, Math.max(min, raw))
        : Math.max(min, raw)
      : min;
    onChange(newValue);
  };

  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };

  const handleIncrement = () => {
    onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);
  };

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="shrink-0 rounded-full"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        min={min}
        max={max}
        required
        disabled={disabled}
        className="text-center"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
        className="shrink-0 rounded-full"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
