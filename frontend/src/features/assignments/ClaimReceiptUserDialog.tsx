import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery, useZero } from '@rocicorp/zero/react';
import { mutators } from '@splitzy/shared-zero/mutators';
import { queries } from '@splitzy/shared-zero/queries';
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
  const { t } = useLingui();
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
        toast.error(t`Failed to claim person`, {
          description: clientResult.error.message,
        });
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t`Something went wrong`;
      console.error('Error claiming receipt user:', error);
      toast.error(t`Failed to claim person`, { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Claim this person</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Claim "{displayName}" as yourself? This will link this user to
              your account.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            type="button"
            onClick={handleClaim}
            disabled={!canClaim || isSaving}
          >
            {isSaving ? <Trans>Claiming…</Trans> : <Trans>Claim</Trans>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
