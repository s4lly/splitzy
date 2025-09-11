import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ChevronDown, Plus, X } from 'lucide-react';
import {
  filterPeople,
  getPersonPreTaxTotalForItem,
} from './utils/receipt-calculation';
import { formatCurrency } from './utils/format-currency';
import { LineItemSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';
import { Toggle } from '../ui/toggle';
import { Label } from '../ui/label';
import { useFeatureFlag } from '@/context/FeatureFlagProvider';

interface MobileAssignmentListProps {
  possiblePeople: string[];
  onAddAssignment: (person: string) => void;
  onRemoveAssignment: (person: string) => void;
  item: z.infer<typeof LineItemSchema>;
  formPricePerItem: number;
  formQuantity: number;
  onAssignmentCancel: () => void;
}

const MobileAssignmentList: React.FC<MobileAssignmentListProps> = ({
  possiblePeople,
  onAddAssignment,
  onRemoveAssignment,
  item,
  formPricePerItem,
  formQuantity,
  onAssignmentCancel,
}) => {
  const [newPerson, setNewPerson] = useState('');
  const newPersonSanitized = newPerson.trim();
  const assignmentsAddAllEnabled = useFeatureFlag('assignments-add-all');

  const filteredPeople = filterPeople(
    possiblePeople,
    item.assignments,
    newPersonSanitized
  );

  const handleAdd = (person: string) => {
    onAddAssignment(person);
    setNewPerson('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPersonSanitized) {
      handleAdd(newPersonSanitized);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-md p-2">
      <div className="flex flex-col gap-2">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="font-medium">Assigned to:</div>
          <Toggle
            pressed
            onClick={onAssignmentCancel}
            aria-label="Close assignments"
          >
            <ChevronDown />
          </Toggle>
        </div>

        {/* assigned list */}
        {item.assignments.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No one assigned yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {item.assignments.map((person) => (
              <li
                key={person}
                className="flex items-center justify-between rounded bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center">
                  <span>{person}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    {formatCurrency(
                      getPersonPreTaxTotalForItem(item, person, {
                        editLineItemsEnabled: true,
                        candidate: {
                          price_per_item: formPricePerItem,
                          quantity: formQuantity,
                        },
                      })
                    )}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => onRemoveAssignment(person)}
                    aria-label={`Remove ${person}`}
                    title={`Remove ${person}`}
                  >
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* assign new */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="new-item-assignment" className="font-semibold">
          New:
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="new-item-assignment"
            type="text"
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Enter name..."
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => newPersonSanitized && handleAdd(newPersonSanitized)}
            disabled={!newPersonSanitized}
          >
            Create
          </Button>
        </div>
      </div>
      <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        {assignmentsAddAllEnabled &&
          filteredPeople.length > 0 &&
          newPersonSanitized === '' && (
            <div className="mb-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  filteredPeople.forEach((person) => handleAdd(person))
                }
                disabled={filteredPeople.length === 0}
                className="w-full"
              >
                Assign All
              </Button>
            </div>
          )}
        {filteredPeople.length === 0 ? (
          <div className="text-center">
            {newPersonSanitized ? (
              <li className="text-sm text-muted-foreground">
                No matching people. Press Enter to add.
              </li>
            ) : (
              <li className="text-sm text-muted-foreground">
                All people assigned.
              </li>
            )}
          </div>
        ) : (
          filteredPeople.map((person) => (
            <li
              key={person}
              className="flex items-center justify-between gap-2 rounded border-b bg-muted/10 pb-2 last-of-type:border-b-0"
            >
              <span>{person}</span>
              <Button
                variant="outline"
                onClick={() => handleAdd(person)}
                className="size-8 rounded-full"
                aria-label={`Assign ${person}`}
                title={`Assign ${person}`}
              >
                <Plus />
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default MobileAssignmentList;
