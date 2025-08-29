import { Trash } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  isValueEmpty: boolean;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const ActionButtons = ({
  isValueEmpty,
  onDelete,
  onCancel,
  onSave,
}: ActionButtonsProps) => {
  return (
    <div className={cn("flex justify-between", isValueEmpty && "justify-end")}>
      {!isValueEmpty && (
        <Button
          variant="outline"
          size="icon"
          className="text-red-500 border-red-500"
          onClick={onDelete}
        >
          <Trash className="size-4" />
        </Button>
      )}
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button onClick={onSave} variant="outline">
          Done
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons;
