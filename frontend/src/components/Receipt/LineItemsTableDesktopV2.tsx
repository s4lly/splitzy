import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AssignmentsContainer } from '@/features/assignments/assignments-container';
import AssignmentsList from '@/features/assignments/assignments-list';
import { LineItemSchema, ReceiptSchema } from '@/lib/receiptSchemas';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Separator } from '../ui/separator';
import { Toggle } from '../ui/toggle';
import LineItemEditForm from './LineItemEditForm';
import PersonAssignmentSection from './PersonAssignmentSection';
import { useLineItemDeleteMutation } from './hooks/useLineItemDeleteMutation';
import { formatCurrency } from './utils/format-currency';
import { getIndividualItemTotalPrice } from './utils/receipt-calculation';

export default function LineItemsTableDesktopV2({
  line_items,
  people,
  result,
  togglePersonAssignment,
}: {
  line_items: z.infer<typeof LineItemSchema>[];
  people: string[];
  result: z.infer<typeof ReceiptSchema>;
  togglePersonAssignment: (itemId: string, person: string) => void;
}) {
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [assignmentItemId, setAssignmentItemId] = useState<string | null>(null);
  const { mutate: deleteItem, isPending: isDeleting } =
    useLineItemDeleteMutation();

  const handleEditOpen = (itemId: string) => {
    setEditItemId(itemId);
    setAssignmentItemId(null);
  };

  const handleAssignmentToggle = (itemId: string) => {
    setEditItemId(null);
    setAssignmentItemId((prevItemId) =>
      prevItemId === itemId ? null : itemId
    );
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem(
      {
        receiptId: String(result?.id),
        itemId: itemId,
      },
      {
        onSuccess: () => {
          setEditItemId(null);
          setAssignmentItemId(null);
        },
      }
    );
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Item</TableHead>
            <TableHead className="w-20">Qty</TableHead>
            <TableHead className="w-24">Price</TableHead>
            <TableHead className="w-24">Total</TableHead>
            <TableHead className="w-fit">Assigned To</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {line_items.map((item) => (
            <>
              {/* edit item */}
              <>
                <TableRow
                  key={item.id}
                  className={cn(
                    (assignmentItemId === item.id || editItemId === item.id) &&
                      'bg-muted/50'
                  )}
                >
                  <TableCell>
                    <span className="text-base font-medium">{item.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-base font-medium">
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-base font-medium">
                      {formatCurrency(item.price_per_item)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(getIndividualItemTotalPrice(item))}
                  </TableCell>
                  <TableCell>
                    <AssignmentsContainer
                      clickCallback={() => handleAssignmentToggle(item.id)}
                      isSelected={assignmentItemId === item.id}
                    >
                      <PersonAssignmentSection item={item} people={people} />
                    </AssignmentsContainer>
                  </TableCell>
                  <TableCell className="text-right">
                    <Toggle
                      onClick={() => handleEditOpen(item.id)}
                      pressed={editItemId === item.id}
                      className={cn(
                        editItemId === item.id && 'data-[state=on]:bg-gray-200'
                      )}
                    >
                      <Pencil className="h-4 w-4" />
                    </Toggle>
                  </TableCell>
                </TableRow>
                {editItemId === item.id && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="hover:bg-transparent">
                      <div className="rounded-lg border">
                        <LineItemEditForm
                          item={item}
                          result={result}
                          onEditCancel={() => setEditItemId(null)}
                        />
                        <Separator />
                        <div className="flex justify-between p-2">
                          <Button
                            onClick={() => handleDeleteItem(item.id)}
                            variant="outline"
                            className="border-red-500 text-red-500"
                          >
                            Delete
                          </Button>
                          <Button
                            onClick={() => setEditItemId(null)}
                            variant="outline"
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {assignmentItemId === item.id && (
                  <TableRow
                    key={item.id + '-assignments'}
                    className="hover:bg-transparent"
                  >
                    <TableCell colSpan={6}>
                      <div className="rounded-lg border">
                        <div className="flex gap-4 p-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium">
                              Assigned Users
                            </h3>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium">Add Users</h3>
                          </div>
                        </div>
                        <AssignmentsList
                          possiblePeople={people}
                          onAddAssignment={(person) => {
                            togglePersonAssignment(item.id, person);
                          }}
                          onRemoveAssignment={(person) => {
                            togglePersonAssignment(item.id, person);
                          }}
                          item={item}
                          formPricePerItem={item.price_per_item}
                          formQuantity={item.quantity}
                        />
                        <Separator />
                        <div className="flex justify-between gap-2 p-2">
                          <Button
                            onClick={() => handleDeleteItem(item.id)}
                            variant="outline"
                            className="border-red-500 text-red-500"
                          >
                            Delete
                          </Button>
                          <Button
                            onClick={() => setAssignmentItemId(null)}
                            variant="outline"
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            </>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
