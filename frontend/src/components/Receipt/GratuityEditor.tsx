import { Plus, Trash } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { formatCurrency } from "./utils/format-currency";
import { useState, useEffect } from "react";
import { useReceiptDataUpdateMutation } from "./hooks/useReceiptDataUpdateMutation";
import ActionButtons from "./ActionButtons";

interface GratuityEditorProps {
  receiptId: string;
  receiptGratuity: number;
}

const GratuityEditor = ({
  receiptId,
  receiptGratuity,
}: GratuityEditorProps) => {
  const [gratuity, setGratuity] = useState(receiptGratuity ?? 0);
  const [isEditing, setIsEditing] = useState(false);

  const isValueEmpty = receiptGratuity === 0;

  useEffect(() => {
    setGratuity(receiptGratuity ?? 0);
  }, [receiptGratuity]);

  const { mutate } = useReceiptDataUpdateMutation();

  const handleEditGratuity = () => {
    setIsEditing(true);
  };

  const handleSaveGratuity = () => {
    setIsEditing(false);
    if (gratuity !== (receiptGratuity ?? 0)) {
      mutate({
        receiptId,
        gratuity: gratuity,
      });
    }
  };

  const handleGratuityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGratuity(Number(e.target.value));
  };

  const handleCancelGratuity = () => {
    setIsEditing(false);
  };

  const handleDeleteGratuity = () => {
    mutate({
      receiptId,
      gratuity: 0,
    });
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
    <div className="border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2">
      {isEditing ? (
        <form
          className="flex flex-col gap-3 py-1 bg-background"
          onSubmit={(e) => e.preventDefault()} // No submit action
        >
          <div className="flex flex-col gap-4">
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
                value={gratuity}
                onChange={handleGratuityChange}
                placeholder="Gratuity"
                min={0}
                step="1"
                required
                className="text-center"
                id="gratuity"
              />
            </div>

            <ActionButtons
              isValueEmpty={isValueEmpty}
              onDelete={handleDeleteGratuity}
              onCancel={handleCancelGratuity}
              onSave={handleSaveGratuity}
            />
          </div>
        </form>
      ) : (
        <>
          <div
            className="flex justify-between items-center py-1 sm:py-2"
            onClick={handleEditGratuity}
          >
            <span className="text-base">Gratuity:</span>
            <span className="text-base font-medium">
              {formatCurrency(receiptGratuity ?? 0)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default GratuityEditor;
