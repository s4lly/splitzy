import type {
  DeleteLineItemData,
  MutationCallbackOptions,
  UpdateLineItemData,
} from '@/features/line-items/types';
import {
  receiptAtom,
  receiptIdAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

export function useZeroLineItemMutations() {
  const zero = useZero();
  const receipt = useAtomValue(receiptAtom);
  const receiptId = useAtomValue(receiptIdAtom);
  const [isDeleting, setIsDeleting] = useState(false);

  const togglePersonAssignment = async (itemId: string, receiptUserId: number) => {
    if (!receipt) {
      return;
    }

    const lineItem = receipt.lineItems.find((item) => item.id === itemId);

    if (!lineItem) {
      console.error(`Line item with id ${itemId} not found`);
      return;
    }

    // const assignments = lineItem.assignments;
    // const isAssigned = assignments.some((a) => a.userId === userId);

    // // Note: The mutator currently expects assignments as string[], but assignments
    // // are now Assignment objects. This may need to be updated to work with the
    // // assignments table directly via insert/delete operations.
    // // For now, converting userIds to strings to match the current mutator signature.
    // const currentUserIds = assignments.map((a) => String(a.userId));
    // const newUserIds = isAssigned
    //   ? currentUserIds.filter((id) => id !== String(userId))
    //   : [...currentUserIds, String(userId)];

    // const result = zero.mutate(
    //   mutators.lineItems.update({
    //     id: itemId,
    //     assignments: newUserIds,
    //   })
    // );

    // const clientResult = await result.client;

    // if (clientResult.type === 'error') {
    //   console.error('Failed to update line item:', clientResult.error.message);
    // } else {
    //   console.info('Successfully updated line item');
    // }
  };

  const handleUpdateLineItem = async (data: UpdateLineItemData) => {
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
    data: DeleteLineItemData,
    options?: MutationCallbackOptions
  ) => {
    setIsDeleting(true);
    try {
      const result = zero.mutate(
        mutators.lineItems.delete({
          id: data.itemId,
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error(
          'Failed to delete line item:',
          clientResult.error.message
        );
        options?.onError?.(new Error(clientResult.error.message));
      } else {
        console.info('Successfully deleted line item');
        options?.onSuccess?.();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    togglePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    receipt,
    receiptId,
    isReady: !!receipt && !!receiptId,
    isDeleting,
  };
}
