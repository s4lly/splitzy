import { Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  isValueEmpty: boolean;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  isPending?: boolean;
}

const ActionButtons = ({
  isValueEmpty,
  onDelete,
  onCancel,
  onSave,
  isPending = false,
}: ActionButtonsProps) => {
  return (
    <div className={cn('flex justify-between', isValueEmpty && 'justify-end')}>
      {!isValueEmpty && (
        <Button
          variant="outline"
          size="icon"
          className="border-red-500 text-red-500"
          onClick={onDelete}
          disabled={isPending}
        >
          <Trash className="size-4" />
        </Button>
      )}
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={onSave} variant="outline" disabled={isPending}>
          Done
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons;
