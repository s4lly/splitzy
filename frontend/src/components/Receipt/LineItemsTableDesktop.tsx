import { Trans, useLingui } from '@lingui/react/macro';
import { useAtomValue } from 'jotai';
import { Pencil } from 'lucide-react';
import { Fragment, useState } from 'react';

import LineItemEditForm from '@/components/Receipt/LineItemEditForm';
import PersonAssignmentSection from '@/components/Receipt/PersonAssignmentSection';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import { AssignmentsContainer } from '@/features/assignments/assignments-container';
import AssignmentsList from '@/features/assignments/assignments-list';
import { useLineItemMutations } from '@/features/line-items/hooks/useLineItemMutations';
import {
  assignedUsersAtom,
  receiptAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { cn } from '@/lib/utils';

export default function LineItemsTableDesktop() {
  const receipt = useAtomValue(receiptAtom);
  const assignedUsers = useAtomValue(assignedUsersAtom);
  const people = assignedUsers.map((a) => a.receiptUserId);
  const {
    addExistingPersonAssignment,
    addNewPersonAssignment,
    removePersonAssignment,
    handleUpdateLineItem: onUpdateLineItem,
    handleDeleteLineItem: onDeleteLineItem,
    isDeleting,
  } = useLineItemMutations();

  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [assignmentItemId, setAssignmentItemId] = useState<string | null>(null);
  const { t } = useLingui();

  if (!receipt) {
    return null;
  }

  const line_items = receipt.lineItems;
  const allAssignments = receipt.lineItems.flatMap((item) => item.assignments);

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
    onDeleteLineItem(
      {
        receiptId: String(receipt.id),
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
            <TableHead className="w-1/2">
              <Trans>Item</Trans>
            </TableHead>
            <TableHead className="w-20">
              <Trans>Qty</Trans>
            </TableHead>
            <TableHead className="w-24">
              <Trans>Price</Trans>
            </TableHead>
            <TableHead className="w-24">
              <Trans>Total</Trans>
            </TableHead>
            <TableHead className="w-fit">
              <Trans>Assigned To</Trans>
            </TableHead>
            <TableHead className="w-12">
              <span className="sr-only">
                <Trans>Actions</Trans>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {line_items.map((item) => (
            <Fragment key={item.id}>
              <TableRow
                key={item.id}
                className={cn(
                  (assignmentItemId === item.id || editItemId === item.id) &&
                    'bg-muted/50'
                )}
              >
                <TableCell>
                  <span className="text-base font-medium">
                    {item.name ?? t`(Unnamed item)`}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-base font-medium">
                    {item.quantity.toNumber()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-base font-medium">
                    {formatCurrency(item.pricePerItem)}
                  </span>
                </TableCell>
                <TableCell>
                  {formatCurrency(
                    calculations.pretax.getIndividualItemTotalPrice(item)
                  )}
                </TableCell>
                <TableCell>
                  <AssignmentsContainer
                    clickCallback={() => handleAssignmentToggle(item.id)}
                    isSelected={assignmentItemId === item.id}
                    ariaLabel={t`Manage assignments for ${item.name ?? t`item`}`}
                  >
                    <PersonAssignmentSection
                      item={item}
                      people={people}
                      receiptId={receipt.id}
                    />
                  </AssignmentsContainer>
                </TableCell>
                <TableCell className="text-right">
                  <Toggle
                    onClick={() => handleEditOpen(item.id)}
                    pressed={editItemId === item.id}
                    aria-expanded={editItemId === item.id}
                    className={cn(
                      editItemId === item.id && 'data-[state=on]:bg-gray-200'
                    )}
                    aria-label={t`Edit ${item.name ?? t`item`}`}
                  >
                    <Pencil aria-hidden />
                  </Toggle>
                </TableCell>
              </TableRow>
              {editItemId === item.id && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="hover:bg-transparent">
                    <div className="rounded-lg border">
                      <LineItemEditForm
                        item={item}
                        receipt={receipt}
                        onEditCancel={() => setEditItemId(null)}
                        onUpdateLineItem={onUpdateLineItem}
                      />
                      <Separator />
                      <div className="flex justify-between p-2">
                        <Button
                          onClick={() => handleDeleteItem(item.id)}
                          variant="outline"
                          className="border-red-500 text-red-500"
                        >
                          <Trans>Delete</Trans>
                        </Button>
                        <Button
                          onClick={() => setEditItemId(null)}
                          variant="outline"
                        >
                          <Trans>Done</Trans>
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
                            <Trans>Assigned Users</Trans>
                          </h3>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium">
                            <Trans>Add Users</Trans>
                          </h3>
                        </div>
                      </div>
                      <AssignmentsList
                        receiptId={receipt.id}
                        possiblePeople={people}
                        onAddExistingPerson={(receiptUserId) =>
                          addExistingPersonAssignment(item.id, receiptUserId)
                        }
                        onAddNewPerson={(displayName) =>
                          addNewPersonAssignment(item.id, displayName)
                        }
                        onRemoveAssignment={(assignmentId) =>
                          removePersonAssignment(item.id, assignmentId)
                        }
                        item={item}
                        formPricePerItem={item.pricePerItem}
                        formQuantity={item.quantity}
                        allAssignments={allAssignments}
                      />
                      <Separator />
                      <div className="flex justify-between gap-2 p-2">
                        <Button
                          onClick={() => handleDeleteItem(item.id)}
                          variant="outline"
                          className="border-red-500 text-red-500"
                        >
                          <Trans>Delete</Trans>
                        </Button>
                        <Button
                          onClick={() => setAssignmentItemId(null)}
                          variant="outline"
                        >
                          <Trans>Done</Trans>
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
