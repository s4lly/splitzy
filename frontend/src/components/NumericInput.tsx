import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [inputValue, setInputValue] = useState<number>(value);

  // Sync internal state when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const newValue = Number.isFinite(raw)
      ? max !== undefined
        ? Math.min(max, Math.max(min, raw))
        : Math.max(min, raw)
      : min;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, inputValue - 1);
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = max ? Math.min(max, inputValue + 1) : inputValue + 1;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={handleDecrement}
        disabled={disabled || inputValue <= min}
        className="shrink-0 rounded-full"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        id={id}
        type="number"
        value={inputValue}
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
        disabled={disabled || (max !== undefined && inputValue >= max)}
        className="shrink-0 rounded-full"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
