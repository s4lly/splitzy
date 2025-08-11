import { formatCurrency } from "./utils/format-currency";
import PersonAssignmentSection from "./PersonAssignmentSection";
import { getIndividualItemTotalPrice } from "./utils/receipt-calculation";
import { LineItemSchema, ReceiptSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LineItemEditForm from "./LineItemEditForm";
import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLineItemDeleteMutation } from "./hooks/useLineItemDeleteMutation";

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
  const { mutate: deleteItem, isPending: isDeleting } =
    useLineItemDeleteMutation();

  const handleEditOpen = (e: React.MouseEvent, itemId: string) => {
    setEditItemId(itemId);
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
                    <div className="border rounded-lg">
                      <LineItemEditForm
                        item={item}
                        result={result}
                        onEditCancel={() => setEditItemId(null)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
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
                    <PersonAssignmentSection
                      item={item}
                      people={people}
                      className="justify-center"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon">
                          <EllipsisVertical className="w-4 h-4" />
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
