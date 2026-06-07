import { Trans, useLingui } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddPersonPanelProps {
  newPerson: string;
  onNewPersonChange: (value: string) => void;
  filteredReceiptUserIds: string[];
  assignmentsAddAllEnabled: boolean;
  getDisplayNameForReceiptUserId: (receiptUserId: string) => string;
  onAddExisting: (receiptUserId: string) => void;
  onAddNew: (displayName: string) => void;
  onAddAll: () => void;
}

const AddPersonPanel: React.FC<AddPersonPanelProps> = ({
  newPerson,
  onNewPersonChange,
  filteredReceiptUserIds,
  assignmentsAddAllEnabled,
  getDisplayNameForReceiptUserId,
  onAddExisting,
  onAddNew,
  onAddAll,
}) => {
  const { t } = useLingui();
  const newPersonSanitized = newPerson.trim();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPersonSanitized) {
      if (filteredReceiptUserIds.includes(newPersonSanitized)) {
        onAddExisting(newPersonSanitized);
      } else {
        onAddNew(newPersonSanitized);
      }
    }
  };

  const handleCreateClick = () => {
    if (newPersonSanitized) {
      if (filteredReceiptUserIds.includes(newPersonSanitized)) {
        onAddExisting(newPersonSanitized);
      } else {
        onAddNew(newPersonSanitized);
      }
    }
  };

  return (
    <div className="flex-1 space-y-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="new-item-assignment" className="font-semibold">
          <Trans>New:</Trans>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="new-item-assignment"
            type="text"
            value={newPerson}
            onChange={(e) => onNewPersonChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t`Enter name...`}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreateClick}
            disabled={!newPersonSanitized}
          >
            <Trans>Create</Trans>
          </Button>
        </div>
      </div>
      <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        {assignmentsAddAllEnabled &&
          filteredReceiptUserIds.length > 0 &&
          newPersonSanitized === '' && (
            <li className="mb-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onAddAll}
                disabled={filteredReceiptUserIds.length === 0}
                className="w-full"
              >
                <Trans>Assign All</Trans>
              </Button>
            </li>
          )}
        {filteredReceiptUserIds.length === 0 ? (
          <li>
            <div className="text-center">
              {newPersonSanitized ? (
                <span className="text-sm text-muted-foreground">
                  <Trans>No matching people. Press Enter to add.</Trans>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  <Trans>All people assigned.</Trans>
                </span>
              )}
            </div>
          </li>
        ) : (
          filteredReceiptUserIds.map((receiptUserId) => {
            const displayName = getDisplayNameForReceiptUserId(receiptUserId);
            return (
              <li
                key={receiptUserId}
                className="flex items-center justify-between gap-2 rounded border-b bg-muted/10 pb-2 last-of-type:border-b-0"
              >
                <span>{displayName}</span>
                <Button
                  variant="outline"
                  onClick={() => onAddExisting(receiptUserId)}
                  className="size-8 rounded-full"
                  aria-label={t`Assign ${displayName}`}
                  title={t`Assign ${displayName}`}
                >
                  <Plus />
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default AddPersonPanel;
