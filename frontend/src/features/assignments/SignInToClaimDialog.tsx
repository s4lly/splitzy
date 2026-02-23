import { SignInButton } from '@clerk/clerk-react';

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
          <DialogTitle>Claim this person</DialogTitle>
          <DialogDescription>
            Create an account or sign in to claim &quot;{displayName}&quot; as
            yourself. You can then link this receipt user to your account and
            keep your receipt history in one place.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <SignInButton mode="modal">
            <Button>Sign in or create account</Button>
          </SignInButton>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
