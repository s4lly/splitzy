import { Trans, useLingui } from '@lingui/react/macro';
import { useAtomValue } from 'jotai';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { getAvatarChipColors } from '@/components/Receipt/utils/avatar-chip-colors';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  assignedUsersAtom,
  receiptAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useMobile } from '@/hooks/useMobile';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import { getUserDisplayName } from '@/utils/user-display';

export const PeopleManagerFormCollab = () => {
  const { t } = useLingui();
  const isMobile = useMobile();
  const assignedUsers = useAtomValue(assignedUsersAtom);
  const receiptUserIds = assignedUsers.map((a) => a.receiptUserId);
  const receipt = useAtomValue(receiptAtom);
  const [newPersonName, setNewPersonName] = useState('');

  const handleAddPerson = () => {
    // Blank implementation - no operation
    // Note: Adding people would require creating new Assignment objects
    if (newPersonName.trim()) {
      setNewPersonName('');
    }
  };

  const handleRemovePerson = (_receiptUserId: string) => {
    // Blank implementation - no operation
    // Note: Removing people would require deleting Assignment objects
  };

  const chipColors =
    receipt && receiptUserIds.length > 0
      ? getAvatarChipColors(receipt.id, receiptUserIds)
      : null;

  return (
    <div className="mb-4 rounded-lg border bg-muted/20 p-3">
      <h3 className="mb-2 font-medium">
        <Trans>Add People to Split With</Trans>
      </h3>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder={t`Enter name`}
          value={newPersonName}
          onChange={(e) => setNewPersonName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
          className="w-full sm:max-w-xs"
        />
        <Button
          onClick={handleAddPerson}
          size="sm"
          className="w-full sm:w-auto"
        >
          <Plus className="mr-1 h-4 w-4" />
          <Trans>Add</Trans>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {assignedUsers.map((assignment) => {
          const receiptUserId = assignment.receiptUserId;
          const displayName = getUserDisplayName(assignment);
          const c = chipColors?.get(receiptUserId);
          return (
            <div
              key={receiptUserId}
              className="flex items-center rounded-full px-3 py-1"
            >
              <Avatar className={cn('ring-1', c?.ring)} title={displayName}>
                <AvatarFallback className={cn(c?.bg, c?.text)}>
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="ml-1 text-sm">{displayName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-5 w-5 rounded-full p-0 hover:bg-destructive/20"
                onClick={() => handleRemovePerson(receiptUserId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
        {receiptUserIds.length === 0 && (
          <p className="text-sm text-muted-foreground">
            <Trans>No people added yet. Add people to split the bill.</Trans>
          </p>
        )}
      </div>
    </div>
  );
};
