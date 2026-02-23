import { useQuery, useZero } from '@rocicorp/zero/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AvatarChipColor } from '@/components/Receipt/utils/avatar-chip-colors';
import {
  DEFAULT_CHIP_COLOR,
  getAvatarChipColors,
} from '@/components/Receipt/utils/avatar-chip-colors';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import { mutators } from '@/zero/mutators';
import { queries } from '@/zero/queries';

interface SwitchReceiptUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousReceiptUser: { id: string; name: string };
  newReceiptUser: { id: string; name: string };
  /** Optional: pass receiptId + possiblePeople to derive avatar colors; otherwise defaults are used */
  receiptId?: number;
  possiblePeople?: string[];
}

/**
 * Determines whether the user is allowed to confirm the switch action.
 * All of the following must be true: dialog is open, current user is known in our system,
 * and both previous and new receipt users have valid non-empty IDs.
 *
 * @param open - Whether the dialog is currently open
 * @param internalUserId - Our internal user id (from Zero), or undefined if not loaded/synced
 * @param previousReceiptUserId - ID of the receipt user being unclaimed
 * @param newReceiptUserId - ID of the receipt user being claimed
 * @returns true if the Switch button should be enabled
 */
function canPerformSwitch(
  open: boolean,
  internalUserId: number | undefined,
  previousReceiptUserId: string,
  newReceiptUserId: string
): boolean {
  // Dialog must be visible for the action to be valid.
  if (!open) return false;
  // We need a known internal user to assign to the new receipt user.
  if (internalUserId == null) return false;
  // Both receipt user IDs must be non-empty for the unclaim/claim pair.
  if (previousReceiptUserId.length === 0) return false;
  if (newReceiptUserId.length === 0) return false;
  return true;
}

export function SwitchReceiptUserDialog({
  open,
  onOpenChange,
  previousReceiptUser,
  newReceiptUser,
  receiptId,
  possiblePeople,
}: SwitchReceiptUserDialogProps) {
  const zero = useZero();
  const [user] = useQuery(queries.users.receipts.byAuthUserId({}));
  const [isSaving, setIsSaving] = useState(false);

  const internalUserId = user?.id;

  // Derive avatar chip colors only when we have receipt scope and participant list.
  let chipColors: Map<string, AvatarChipColor> | null = null;
  if (receiptId != null && possiblePeople != null) {
    chipColors = getAvatarChipColors(receiptId, possiblePeople);
  }

  // Use scoped colors when available; otherwise fall back to default chip styling.
  const previousColor =
    chipColors?.get(previousReceiptUser.id) ?? DEFAULT_CHIP_COLOR;
  const newColor = chipColors?.get(newReceiptUser.id) ?? DEFAULT_CHIP_COLOR;

  const canSwitch = canPerformSwitch(
    open,
    internalUserId,
    previousReceiptUser.id,
    newReceiptUser.id
  );

  const handleSwitch = async () => {
    if (internalUserId == null) return;

    setIsSaving(true);
    try {
      // Step 1: Unlink our account from the previous receipt user.
      const unclaimResult = zero.mutate(
        mutators.receiptUsers.update({
          id: previousReceiptUser.id,
          user_id: null,
        })
      );
      const unclaimClient = await unclaimResult.client;
      if (unclaimClient.type === 'error') {
        console.error(
          'Failed to unclaim previous receipt user:',
          unclaimClient.error.message
        );
        toast.error('Failed to switch person', {
          description: unclaimClient.error.message,
        });
        return;
      }

      // Step 2: Link our account to the new receipt user.
      const claimResult = zero.mutate(
        mutators.receiptUsers.update({
          id: newReceiptUser.id,
          user_id: internalUserId,
        })
      );
      const claimClient = await claimResult.client;
      if (claimClient.type === 'error') {
        console.error(
          'Failed to claim new receipt user:',
          claimClient.error.message
        );
        // Best-effort rollback: restore user_id on previous receipt user
        try {
          const rollbackResult = zero.mutate(
            mutators.receiptUsers.update({
              id: previousReceiptUser.id,
              user_id: internalUserId,
            })
          );
          const rollbackClient = await rollbackResult.client;
          if (rollbackClient.type === 'error') {
            console.error('Rollback failed:', rollbackClient.error.message);
            toast.error('Failed to switch person', {
              description:
                'Could not restore your original claim. Please try claiming again manually.',
            });
          } else {
            toast.error('Failed to switch person', {
              description: 'Your original claim has been restored.',
            });
          }
        } catch (rollbackError) {
          console.error('Rollback threw an exception:', rollbackError);
          toast.error('Failed to switch person', {
            description:
              'Could not restore your original claim. Please try claiming again manually.',
          });
        }
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      console.error('Error switching receipt user:', error);
      toast.error('Failed to switch person', { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  // Button label reflects in-progress state for accessibility and clarity.
  let switchButtonLabel: string;
  if (isSaving) {
    switchButtonLabel = 'Switching…';
  } else {
    switchButtonLabel = 'Switch';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch to this person</DialogTitle>
          <DialogDescription>
            Move your claim from &quot;{previousReceiptUser.name}&quot; to
            &quot;{newReceiptUser.name}&quot;? Your account will be linked to
            the new receipt user.
          </DialogDescription>
        </DialogHeader>
        {/* Previous and new receipt user avatars with arrow indicating the switch direction. */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <Avatar
              className={cn('ring-2', previousColor.ring)}
              title={previousReceiptUser.name}
            >
              <AvatarFallback
                className={cn(previousColor.bg, previousColor.text)}
              >
                {getInitials(previousReceiptUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate text-center text-sm text-muted-foreground">
              {previousReceiptUser.name}
            </span>
          </div>
          <ArrowRight
            className="size-6 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="flex flex-col items-center gap-2">
            <Avatar
              className={cn('ring-2', newColor.ring)}
              title={newReceiptUser.name}
            >
              <AvatarFallback className={cn(newColor.bg, newColor.text)}>
                {getInitials(newReceiptUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate text-center text-sm text-muted-foreground">
              {newReceiptUser.name}
            </span>
          </div>
        </div>
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
            onClick={handleSwitch}
            disabled={!canSwitch || isSaving}
          >
            {switchButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
