import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from './utils/format-currency';
import { useState, useEffect } from 'react';
import { useReceiptDataUpdateMutation } from './hooks/useReceiptDataUpdateMutation';
import ActionButtons from './ActionButtons';
import ClickableRow from './components/ClickableRow';
import AddableRow from './components/AddableRow';

interface GratuityEditorProps {
  receiptId: string;
  receiptGratuity: number;
}

const GratuityEditor = ({
  receiptId,
  receiptGratuity,
}: GratuityEditorProps) => {
  const [gratuity, setGratuity] = useState(receiptGratuity ?? 0);
  const [gratuityInput, setGratuityInput] = useState(
    receiptGratuity ? receiptGratuity.toFixed(2) : '0.00'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValueEmpty = receiptGratuity === 0;

  useEffect(() => {
    setGratuity(receiptGratuity ?? 0);
    setGratuityInput(receiptGratuity ? receiptGratuity.toFixed(2) : '0.00');
  }, [receiptGratuity]);

  const { mutate, isPending } = useReceiptDataUpdateMutation();

  const handleEditGratuity = () => {
    setGratuityInput(receiptGratuity ? receiptGratuity.toFixed(2) : '0.00');
    setGratuity(receiptGratuity ?? 0);
    setError(null);
    setIsEditing(true);
  };

  const handleSaveGratuity = () => {
    if (gratuity !== (receiptGratuity ?? 0)) {
      setError(null);
      mutate(
        {
          receiptId,
          gratuity: gratuity,
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            setError(null);
          },
          onError: (error) => {
            const errorMessage =
              error?.message || 'Failed to save gratuity. Please try again.';
            setError(errorMessage);
          },
        }
      );
    } else {
      setIsEditing(false);
    }
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
    setError(null);
    setIsEditing(false);
  };

  const handleDeleteGratuity = () => {
    setError(null);
    mutate(
      {
        receiptId,
        gratuity: 0,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setError(null);
        },
        onError: (error) => {
          const errorMessage =
            error?.message || 'Failed to delete gratuity. Please try again.';
          setError(errorMessage);
        },
      }
    );
  };

  if (isValueEmpty && !isEditing) {
    return <AddableRow label="Gratuity" onClick={handleEditGratuity} />;
  }

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <form
          className="flex flex-col gap-3 bg-background py-1"
          onSubmit={(e) => e.preventDefault()} // No submit action
        >
          <div className="flex flex-col gap-4 px-2 py-1">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}

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
                disabled={isPending}
              />
            </div>

            <ActionButtons
              isValueEmpty={isValueEmpty}
              onDelete={handleDeleteGratuity}
              onCancel={handleCancelGratuity}
              onSave={handleSaveGratuity}
              isPending={isPending}
            />
          </div>
        </form>
      ) : (
        <ClickableRow
          label="Gratuity"
          value={formatCurrency(receiptGratuity ?? 0)}
          onClick={handleEditGratuity}
        />
      )}
    </div>
  );
};

export default GratuityEditor;
