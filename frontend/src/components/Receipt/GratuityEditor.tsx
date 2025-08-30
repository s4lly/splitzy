import { Plus, Trash } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { formatCurrency } from "./utils/format-currency";
import { useState, useEffect } from "react";
import { useReceiptDataUpdateMutation } from "./hooks/useReceiptDataUpdateMutation";
import ActionButtons from "./ActionButtons";
import ClickableRow from "./components/ClickableRow";

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
    String(receiptGratuity ?? 0)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValueEmpty = receiptGratuity === 0;

  useEffect(() => {
    setGratuity(receiptGratuity ?? 0);
    setGratuityInput(String(receiptGratuity ?? 0));
  }, [receiptGratuity]);

  const { mutate, isPending } = useReceiptDataUpdateMutation();

  const handleEditGratuity = () => {
    setGratuityInput(String(receiptGratuity ?? 0));
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
            const errorMessage = error?.message || 'Failed to save gratuity. Please try again.';
            setError(errorMessage);
          }
        }
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleGratuityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const newValue = Number.isFinite(v) ? Math.max(0, v) : 0;
    setGratuity(newValue);
    setGratuityInput(e.target.value);
  };

  const handleCancelGratuity = () => {
    setGratuityInput(String(receiptGratuity ?? 0));
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
          const errorMessage = error?.message || 'Failed to delete gratuity. Please try again.';
          setError(errorMessage);
        }
      }
    );
  };

  if (isValueEmpty && !isEditing) {
    return (
      <div className="flex gap-2 justify-between items-center border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2">
        <span className="text-base">Gratuity:</span>
        <Button
          onClick={handleEditGratuity}
          variant="outline"
          className="size-8"
        >
          <Plus />
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-sm -ml-2 -mr-2">
      {isEditing ? (
        <form
          className="flex flex-col gap-3 py-1 bg-background"
          onSubmit={(e) => e.preventDefault()} // No submit action
        >
          <div className="flex flex-col gap-4 py-1 px-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-2">
                <div className="text-destructive text-sm">{error}</div>
              </div>
            )}
            
            <div className="flex items-center gap-2 justify-between">
              <Label htmlFor="gratuity" className="text-sm font-medium">
                Gratuity:
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-lg pr-1 select-none">
                $
              </span>
              <Input
                type="number"
                value={gratuityInput}
                onChange={handleGratuityChange}
                placeholder="Gratuity"
                min={0}
                step="1"
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
