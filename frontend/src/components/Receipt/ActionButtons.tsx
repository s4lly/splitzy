import { Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  shouldShowDeleteButton?: boolean;
  onDestructive?: () => void;
  onCancel?: () => void;
  onConstructive: () => void;
  isPending?: boolean;
  destructiveLabel?: string;
  constructiveLabel?: string;
}

const ActionButtons = ({
  shouldShowDeleteButton = false,
  onDestructive,
  onCancel,
  onConstructive,
  isPending = false,
  destructiveLabel = 'Delete',
  constructiveLabel = 'Done',
}: ActionButtonsProps) => {
  return (
    <div
      className={cn(
        'flex justify-between',
        !shouldShowDeleteButton && 'justify-end'
      )}
    >
      {shouldShowDeleteButton && onDestructive && (
        <Button
          variant="outline"
          size="icon"
          className="border-red-500 text-red-500"
          onClick={onDestructive}
          disabled={isPending}
        >
          <Trash className="size-4" />
        </Button>
      )}
      <div className="flex gap-2">
        {onCancel && (
          <Button onClick={onCancel} variant="outline" disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button onClick={onConstructive} variant="outline" disabled={isPending}>
          {constructiveLabel}
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons;
