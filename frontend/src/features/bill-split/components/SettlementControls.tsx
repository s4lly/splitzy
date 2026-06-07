import { Trans } from '@lingui/react/macro';
import { Check } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface SettlementControlsProps {
  allPaid: boolean;
  onSoftDelete: () => void;
}

export const SettlementControls = ({
  allPaid,
  onSoftDelete,
}: SettlementControlsProps) => {
  // Intentionally ephemeral: this is a one-click confirmation step that
  // reveals the destructive "Delete this record" action. There is no backend
  // "marked complete" concept — persistence comes from allPaid (each user's
  // paidAt timestamp). On remount, allPaid will still be true, so the user
  // simply clicks once again. No data is lost.
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // When the receipt is no longer fully paid, retract the "marked complete"
  // confirmation and close the delete dialog so the destructive action can't be
  // taken. Adjusted inline during render via a prev-prop comparison (instead of
  // a useEffect) to avoid an extra render with stale UI between commits.
  const prevAllPaidRef = useRef(allPaid);
  if (allPaid !== prevAllPaidRef.current) {
    prevAllPaidRef.current = allPaid;
    if (!allPaid) {
      setIsMarkedComplete(false);
      setDeleteDialogOpen(false);
    }
  }

  return (
    <div className="mt-4 border-t pt-5">
      <Button
        className={cn(
          'w-full transition-colors',
          isMarkedComplete &&
            'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
        )}
        disabled={!allPaid || isMarkedComplete}
        onClick={() => setIsMarkedComplete(true)}
      >
        {isMarkedComplete ? (
          <>
            <Check className="mr-1.5 h-4 w-4" />
            <Trans>Marked complete</Trans>
          </>
        ) : (
          <Trans>All settled — mark complete</Trans>
        )}
      </Button>

      {isMarkedComplete && allPaid && (
        <div className="mt-3 text-center">
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-xs font-medium text-destructive/65 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Trans>Delete this record</Trans>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Trans>Delete receipt?</Trans>
                </DialogTitle>
                <DialogDescription>
                  <Trans>
                    This will remove the receipt for everyone who has the link.
                    This action cannot be undone.
                  </Trans>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  <Trans>Cancel</Trans>
                </Button>
                <Button variant="destructive" onClick={onSoftDelete}>
                  <Trans>Delete</Trans>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};
