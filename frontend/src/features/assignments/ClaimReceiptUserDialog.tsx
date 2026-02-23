import { useQuery, useZero } from '@rocicorp/zero/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mutators } from '@/zero/mutators';
import { queries } from '@/zero/queries';

interface ClaimReceiptUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptUserId: string;
  displayName: string;
}

export function ClaimReceiptUserDialog({
  open,
  onOpenChange,
  receiptUserId,
  displayName,
}: ClaimReceiptUserDialogProps) {
  const zero = useZero();
  const [user] = useQuery(queries.users.receipts.byAuthUserId({}));
  const [isSaving, setIsSaving] = useState(false);

  const internalUserId = user?.id;
  const canClaim = open && internalUserId != null && receiptUserId.length > 0;

  const handleClaim = async () => {
    if (internalUserId == null) return;

    setIsSaving(true);
    try {
      const result = zero.mutate(
        mutators.receiptUsers.update({
          id: receiptUserId,
          user_id: internalUserId,
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error(
          'Failed to claim receipt user:',
          clientResult.error.message
        );
        toast.error('Failed to claim person', {
          description: clientResult.error.message,
        });
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      console.error('Error claiming receipt user:', error);
      toast.error('Failed to claim person', { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim this person</DialogTitle>
          <DialogDescription>
            Claim &quot;{displayName}&quot; as yourself? This will link this
            user to your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleClaim}
            disabled={!canClaim || isSaving}
          >
            {isSaving ? 'Claiming…' : 'Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
