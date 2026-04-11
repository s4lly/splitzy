import { SignInButton } from '@clerk/clerk-react';
import { Trans } from '@lingui/react/macro';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SignInToClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
}

export function SignInToClaimDialog({
  open,
  onOpenChange,
  displayName,
}: SignInToClaimDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Claim this person</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Create an account or sign in to claim "{displayName}" as yourself.
              You can then link this receipt user to your account and keep your
              receipt history in one place.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            <Trans>Close</Trans>
          </Button>
          <SignInButton mode="modal">
            <Button className="w-full sm:w-auto">
              <Trans>Sign in or create account</Trans>
            </Button>
          </SignInButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
