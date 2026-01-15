import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import { useState } from 'react';

interface ImageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: number;
  imageVisibility: string | null | undefined;
}

export function ImageSettingsDialog({
  open,
  onOpenChange,
  receiptId,
  imageVisibility,
}: ImageSettingsDialogProps) {
  const zero = useZero();
  const [isSaving, setIsSaving] = useState(false);
  const isPrivate = imageVisibility === 'owner_only';

  const handleVisibilityToggle = async (checked: boolean) => {
    setIsSaving(true);

    try {
      const newVisibility = checked ? 'owner_only' : 'public';

      const result = zero.mutate(
        mutators.receipts.update({
          id: receiptId,
          image_visibility: newVisibility,
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error(
          'Failed to update image visibility:',
          clientResult.error.message
        );
      } else {
        console.info('Successfully updated image visibility');
      }
    } catch (error) {
      console.error('Error updating image visibility:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Image Settings</DialogTitle>
          <DialogDescription>
            Control who can see the receipt image.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between space-x-2 py-4">
          <Label htmlFor="image-visibility" className="flex flex-col space-y-1">
            <span>Private Image</span>
            <span className="text-xs font-normal text-muted-foreground">
              Only you can see the image when enabled
            </span>
          </Label>
          <Switch
            id="image-visibility"
            checked={isPrivate}
            onCheckedChange={handleVisibilityToggle}
            disabled={isSaving}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
