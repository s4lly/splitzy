import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EditableDetail from '@/features/summary-card/EditableDetail';
import { cn } from '@/lib/utils';
import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import Decimal from 'decimal.js';
import { Trash } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GratuityEditorProps {
  receiptGratuity: Decimal;
  receiptId: number;
}

/**
 * GratuityEditor component that allows editing and saving gratuity values.
 * Performs mutations using Zero mutators.
 */
const GratuityEditor = ({
  receiptGratuity = new Decimal(0),
  receiptId,
}: GratuityEditorProps) => {
  const zero = useZero();
  const [gratuity, setGratuity] = useState<Decimal>(receiptGratuity);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetToInitialValue = () => {
    setGratuity(receiptGratuity);
  };

  const hasValueToDelete = !receiptGratuity.isZero();

  useEffect(() => {
    resetToInitialValue();
  }, [receiptGratuity]);

  const handleEditGratuity = () => {
    resetToInitialValue();
    setIsEditing(true);
  };

  const handleSaveGratuity = async () => {
    if (!receiptId) {
      console.error('Receipt ID is required to save gratuity');
      return;
    }

    setIsSaving(true);
    try {
      const result = zero.mutate(
        mutators.receipts.update({
          id: receiptId,
          gratuity: gratuity.toNumber(),
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error('Failed to update gratuity:', clientResult.error.message);
      } else {
        console.info('Successfully updated gratuity');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating gratuity:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGratuityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Treat empty or "." as 0
    if (rawValue === '' || rawValue === '.') {
      setGratuity(new Decimal(0));
      return;
    }

    // Parse with Decimal, fallback to current value on invalid input
    let parsedValue: Decimal;
    try {
      parsedValue = new Decimal(rawValue);
    } catch {
      return; // Keep current value on invalid input
    }

    // Clamp to non-negative value
    const clampedValue = Decimal.max(0, parsedValue);

    // Round to two decimals
    const roundedValue = clampedValue.toDP(2);

    setGratuity(roundedValue);
  };

  const handleCancelGratuity = () => {
    setGratuity(receiptGratuity);
    setIsEditing(false);
  };

  const handleDeleteGratuity = async () => {
    if (!receiptId) {
      console.error('Receipt ID is required to delete gratuity');
      return;
    }

    setIsSaving(true);
    try {
      const result = zero.mutate(
        mutators.receipts.update({
          id: receiptId,
          gratuity: 0,
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error('Failed to delete gratuity:', clientResult.error.message);
      } else {
        console.info('Successfully deleted gratuity');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting gratuity:', error);
    } finally {
      setIsSaving(false);
    }
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
              value={gratuity.toNumber()}
              onChange={handleGratuityChange}
              placeholder="Gratuity"
              min={0}
              step="0.01"
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
                disabled={isSaving}
              >
                <Trash className="size-4" />
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleCancelGratuity}
                variant="outline"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveGratuity}
                variant="outline"
                disabled={isSaving}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EditableDetail
          label="Gratuity"
          value={formatCurrency(receiptGratuity)}
          onClick={handleEditGratuity}
        />
      )}
    </div>
  );
};

export default GratuityEditor;

