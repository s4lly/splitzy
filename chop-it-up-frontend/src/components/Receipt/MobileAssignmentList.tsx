import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Trash, X } from "lucide-react";
import {
  filterPeople,
  getPersonPreTaxTotalForItem,
  getTotalForAllItems,
} from "./utils/receipt-calculation";
import { formatCurrency } from "./utils/format-currency";
import { LineItemSchema } from "@/lib/receiptSchemas";
import { z } from "zod";

interface MobileAssignmentListProps {
  possiblePeople: string[];
  onAddAssignment: (person: string) => void;
  onRemoveAssignment: (person: string) => void;
  item: z.infer<typeof LineItemSchema>;
  total: number;
  formPricePerItem: number;
  formQuantity: number;
}

const MobileAssignmentList: React.FC<MobileAssignmentListProps> = ({
  possiblePeople,
  onAddAssignment,
  onRemoveAssignment,
  item,
  total,
  formPricePerItem,
  formQuantity,
}) => {
  const [newPerson, setNewPerson] = useState("");
  const newPersonSanitized = newPerson.trim();

  const filteredPeople = filterPeople(
    possiblePeople,
    item.assignments,
    newPerson
  );

  const handleAdd = (person: string) => {
    onAddAssignment(person);
    setNewPerson("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newPersonSanitized) {
      handleAdd(newPersonSanitized);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 bg-background rounded-md shadow-sm">
      <div>
        <div className="flex justify-between items-center">
          <div className="font-semibold mb-2">Assigned</div>
          <div className="text-sm text-muted-foreground mb-2">
            Item Total: {formatCurrency(total)}
          </div>
        </div>

        {item.assignments.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No one assigned yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {item.assignments.map((person) => (
              <li
                key={person}
                className="flex items-center justify-between bg-muted/30 rounded px-3 py-2"
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
        <div className="font-semibold mb-2">Assign New</div>
        <div className="flex gap-2 items-center px-3 mb-2">
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
        <ul className="flex flex-col gap-2 max-h-40 overflow-y-auto">
        <div className="mb-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => filteredPeople.forEach((person) => handleAdd(person))}
            disabled={filteredPeople.length === 0}
            className="w-full"
          >
            Assign All
          </Button>
        </div>
          {filteredPeople.length === 0 ? (
            <div className="px-3">
              {newPersonSanitized ? (
                <li className="text-muted-foreground text-sm">
                  No matching people. Press Enter to add.
                </li>
              ) : (
                <li className="text-muted-foreground text-sm">
                  All people assigned.
                </li>
              )}
            </div>
          ) : (
            filteredPeople.map((person) => (
              <li
                key={person}
                className="flex items-center justify-between bg-muted/10 rounded px-3 py-2"
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
