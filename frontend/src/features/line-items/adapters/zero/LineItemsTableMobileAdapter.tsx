import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import {
  receiptAtom,
  receiptIdAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import { useAtomValue } from 'jotai';

export function LineItemsTableMobileAdapter({ people }: { people: string[] }) {
  const zero = useZero();
  const receipt = useAtomValue(receiptAtom);
  const receiptId = useAtomValue(receiptIdAtom);

  const togglePersonAssignment = async (itemId: string, person: string) => {
    if (!receipt) {
      return;
    }

    const lineItem = receipt.lineItems.find((item) => item.id === itemId);

    if (!lineItem) {
      console.error(`Line item with id ${itemId} not found`);
      return;
    }

    const assignments = lineItem.assignments;
    const isAssigned = assignments.includes(person);

    const newAssignments = isAssigned
      ? assignments.filter((p) => p !== person)
      : [...assignments, person];

    const result = zero.mutate(
      mutators.lineItems.update({
        id: itemId,
        assignments: newAssignments,
      })
    );

    const clientResult = await result.client;

    if (clientResult.type === 'error') {
      console.error('Failed to update line item:', clientResult.error.message);
    } else {
      console.info('Successfully updated line item');
    }
  };

  // Blank handler - Zero Query mutations will be implemented in the future
  const handleUpdateLineItem = async (data: {
    receiptId: string;
    itemId: string;
    name?: string;
    quantity?: number;
    price_per_item?: number;
  }) => {
    const result = zero.mutate(
      mutators.lineItems.update({
        id: data.itemId,
        name: data.name,
        quantity: data.quantity,
        price_per_item: data.price_per_item,
      })
    );

    const clientResult = await result.client;

    if (clientResult.type === 'error') {
      console.error('Failed to update line item:', clientResult.error.message);
    } else {
      console.info('Successfully updated line item');
    }
  };

  const handleDeleteLineItem = async (
    data: {
      receiptId: string;
      itemId: string;
    },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    const result = zero.mutate(
      mutators.lineItems.delete({
        id: data.itemId,
      })
    );

    const clientResult = await result.client;

    if (clientResult.type === 'error') {
      console.error('Failed to delete line item:', clientResult.error.message);
      options?.onError?.(new Error(clientResult.error.message));
    } else {
      console.info('Successfully deleted line item');
      options?.onSuccess?.();
    }
  };

  if (!receipt || !receiptId) {
    return null;
  }

  return (
    <LineItemsTableMobile
      line_items={receipt.lineItems}
      receipt={receipt}
      people={people}
      togglePersonAssignment={togglePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={false}
    />
  );
}
