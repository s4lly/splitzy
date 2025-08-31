import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X } from 'lucide-react';
import {
  filterPeople,
  getPersonPreTaxTotalForItem,
} from './utils/receipt-calculation';
import { formatCurrency } from './utils/format-currency';
import { LineItemSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';

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

  const filteredPeople = filterPeople(
    possiblePeople,
    item.assignments,
    newPerson
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
    <div className="flex flex-col gap-4 rounded-md bg-background p-3 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Assigned</div>
          <Button size="icon" variant="outline" onClick={onAssignmentCancel}>
            <X className="size-4" />
          </Button>
        </div>

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
                  >
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="mb-2 font-semibold">Assign New</div>
        <div className="mb-2 flex items-center gap-2 px-3">
          <Input
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
            Add
          </Button>
        </div>
        <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
          {filteredPeople.length > 0 && (
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
            <div className="px-3">
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
                className="flex items-center justify-between rounded bg-muted/10 px-3 py-2"
              >
                <span>{person}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAdd(person)}
                  className="ml-2"
                >
                  Add
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default MobileAssignmentList;
