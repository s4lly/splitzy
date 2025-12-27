import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EditableDetail from '@/features/summary-card/EditableDetail';
import { cn } from '@/lib/utils';
import { Trash } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GratuityEditorReadOnlyProps {
  receiptGratuity: number;
}

/**
 * Read-only version of GratuityEditor that maintains the UI but doesn't perform mutations.
 * All save/delete operations are noops.
 */
const GratuityEditorReadOnly = ({
  receiptGratuity,
}: GratuityEditorReadOnlyProps) => {
  const [gratuity, setGratuity] = useState(receiptGratuity ?? 0);
  const [gratuityInput, setGratuityInput] = useState(
    receiptGratuity ? receiptGratuity.toFixed(2) : '0.00'
  );
  const [isEditing, setIsEditing] = useState(false);

  const hasValueToDelete = receiptGratuity > 0;

  useEffect(() => {
    setGratuity(receiptGratuity ?? 0);
    setGratuityInput(receiptGratuity ? receiptGratuity.toFixed(2) : '0.00');
  }, [receiptGratuity]);

  // Noop functions - UI only, no mutations
  const handleEditGratuity = () => {
    setGratuityInput(receiptGratuity ? receiptGratuity.toFixed(2) : '0.00');
    setGratuity(receiptGratuity ?? 0);
    setIsEditing(true);
  };

  const handleSaveGratuity = () => {
    // Noop - no mutation performed
    setIsEditing(false);
  };

  const handleGratuityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input for better UX
    if (inputValue === '') {
      setGratuityInput('');
      setGratuity(0);
      return;
    }

    // Validate the input pattern
    const pattern = /^\d*(\.\d{0,2})?$/;
    if (!pattern.test(inputValue)) {
      return; // Don't update if pattern doesn't match
    }

    const v = parseFloat(inputValue);
    const newValue = Number.isFinite(v) ? Math.max(0, v) : 0;
    setGratuity(newValue);
    setGratuityInput(inputValue);
  };

  const handleCancelGratuity = () => {
    setGratuityInput(receiptGratuity ? receiptGratuity.toFixed(2) : '0.00');
    setGratuity(receiptGratuity ?? 0);
    setIsEditing(false);
  };

  const handleDeleteGratuity = () => {
    // Noop - no mutation performed
    setIsEditing(false);
  };

  if (!hasValueToDelete && !isEditing) {
    return (
      <div className="-ml-2 -mr-2 rounded-sm border">
        <EditableDetail
          label="Gratuity"
          value={formatCurrency(0)}
          onClick={handleEditGratuity}
        />
      </div>
    );
  }

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="gratuity" className="text-sm font-medium">
              Gratuity:
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <span className="select-none pr-1 text-lg text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              value={gratuityInput}
              onChange={handleGratuityChange}
              placeholder="Gratuity"
              min="0"
              step="0.01"
              inputMode="decimal"
              pattern="^\d*(\.\d{0,2})?$"
              required
              className="text-center"
              id="gratuity"
            />
          </div>

          <div
            className={cn(
              'flex justify-end',
              hasValueToDelete && 'justify-between'
            )}
          >
            {hasValueToDelete && (
              <Button
                variant="outline"
                size="icon"
                className="border-red-500 text-red-500"
                onClick={handleDeleteGratuity}
                aria-label="Delete gratuity"
                title="Delete gratuity"
              >
                <Trash className="size-4" />
              </Button>
            )}
            <div className="flex gap-2">
              <Button onClick={handleCancelGratuity} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSaveGratuity} variant="outline">
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EditableDetail
          label="Gratuity"
          value={formatCurrency(receiptGratuity ?? 0)}
          onClick={handleEditGratuity}
        />
      )}
    </div>
  );
};

export default GratuityEditorReadOnly;

