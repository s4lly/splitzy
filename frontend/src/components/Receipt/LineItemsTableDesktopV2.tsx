import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import LineItemEditForm from './LineItemEditForm';
import PersonAssignmentSection from './PersonAssignmentSection';
import { useLineItemDeleteMutation } from './hooks/useLineItemDeleteMutation';
import { formatCurrency } from './utils/format-currency';
import { getIndividualItemTotalPrice } from './utils/receipt-calculation';

export default function LineItemsTableDesktopV2({
  line_items,
  people,
  result,
}: {
  line_items: z.infer<typeof LineItemSchema>[];
  people: string[];
  result: z.infer<typeof ReceiptSchema>;
}) {
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [assignmentItemId, setAssignmentItemId] = useState<string | null>(null);
  const { mutate: deleteItem, isPending: isDeleting } =
    useLineItemDeleteMutation();

  const handleEditOpen = (e: React.MouseEvent, itemId: string) => {
    setEditItemId(itemId);
    setAssignmentItemId(null);
  };

  const handleAssignmentOpen = (e: React.MouseEvent, itemId: string) => {
    setAssignmentItemId(itemId);
    setEditItemId(null);
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
              {editItemId === item.id ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="hover:bg-transparent">
                    <div className="rounded-lg border">
                      <LineItemEditForm
                        item={item}
                        result={result}
                        onEditCancel={() => setEditItemId(null)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : assignmentItemId === item.id ? (
                <AssignmentsList
                  possiblePeople={people}
                  onAddAssignment={(person) => {}}
                  onRemoveAssignment={(person) => {}}
                  item={item}
                  formPricePerItem={item.price_per_item}
                  formQuantity={item.quantity}
                  onAssignmentCancel={() => setAssignmentItemId(null)}
                />
              ) : (
                <TableRow key={item.id}>
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
                      clickCallback={(e) => handleAssignmentOpen(e, item.id)}
                    >
                      <PersonAssignmentSection item={item} people={people} />
                    </AssignmentsContainer>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon">
                          <EllipsisVertical className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={(e) => handleEditOpen(e, item.id)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={() =>
                            deleteItem({
                              receiptId: String(result.id),
                              itemId: item.id,
                            })
                          }
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
