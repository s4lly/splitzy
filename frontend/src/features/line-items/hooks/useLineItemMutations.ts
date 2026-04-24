import { useZero } from '@rocicorp/zero/react';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { ulid } from 'ulid';

import type {
  DeleteLineItemData,
  MutationCallbackOptions,
  UpdateLineItemData,
} from '@/features/line-items/types';
import {
  planAddRebalance,
  planRemoveRebalance,
  type SiblingShareUpdate,
} from '@/features/line-items/utils/rebalance-shares';
import {
  receiptAtom,
  receiptIdAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { mutators } from '@/zero/mutators';

export function useLineItemMutations() {
  const zero = useZero();
  const receipt = useAtomValue(receiptAtom);
  const receiptId = useAtomValue(receiptIdAtom);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Generate a unique ID for new database records using ULID.
   * ULID provides:
   * - Time-ordered IDs (better for database indexing)
   * - URL-safe encoding (base32)
   * - 128-bit entropy (extremely low collision risk)
   * - Lexicographically sortable
   */
  const generateId = (): string => {
    return ulid();
  };

  const applySiblingUpdates = async (updates: SiblingShareUpdate[]) => {
    const results = await Promise.all(
      updates.map((update) => zero.mutate(mutators.assignments.update(update)).client)
    );
    for (const result of results) {
      if (result.type === 'error') {
        console.error(
          'Failed to apply sibling rebalance update:',
          result.error.message
        );
      }
    }
  };

  /**
   * Add an assignment for an existing receipt user to a line item.
   */
  const addExistingPersonAssignment = async (
    itemId: string,
    receiptUserId: string
  ) => {
    if (!receipt) {
      return;
    }

    const lineItem = receipt.lineItems.find((item) => item.id === itemId);
    if (!lineItem) {
      console.error(`Line item with id ${itemId} not found`);
      return;
    }

    // Check if assignment already exists
    const existingAssignment = lineItem.assignments.find(
      (a) => a.receiptUserId === receiptUserId && !a.deletedAt
    );
    if (existingAssignment) {
      console.info('Assignment already exists');
      return;
    }

    const assignmentId = generateId();
    const activeSiblings = lineItem.assignments.filter((a) => !a.deletedAt);
    const rebalance = planAddRebalance(activeSiblings);

    const result = zero.mutate(
      mutators.assignments.insert({
        id: assignmentId,
        receipt_user_id: receiptUserId,
        receipt_line_item_id: itemId,
        share_percentage: rebalance ? rebalance.newcomerShare : null,
        locked: rebalance ? rebalance.newcomerLocked : false,
      })
    );

    const clientResult = await result.client;
    if (clientResult.type === 'error') {
      console.error('Failed to create assignment:', clientResult.error.message);
      return;
    }
    console.info('Successfully created assignment');

    if (rebalance) {
      await applySiblingUpdates(rebalance.siblingUpdates);
    }
  };

  /**
   * Add an assignment for a new receipt user (by display name) to a line item.
   * Creates the receipt_user first, then creates the assignment.
   */
  const addNewPersonAssignment = async (
    itemId: string,
    displayName: string
  ) => {
    if (!receipt) {
      return;
    }

    const lineItem = receipt.lineItems.find((item) => item.id === itemId);
    if (!lineItem) {
      console.error(`Line item with id ${itemId} not found`);
      return;
    }

    const receiptUserId = generateId();
    const assignmentId = generateId();

    // First, create the receipt_user
    const receiptUserResult = zero.mutate(
      mutators.receiptUsers.insert({
        id: receiptUserId,
        display_name: displayName,
      })
    );

    const receiptUserClientResult = await receiptUserResult.client;
    if (receiptUserClientResult.type === 'error') {
      console.error(
        'Failed to create receipt user:',
        receiptUserClientResult.error.message
      );
      return;
    }

    // Then, create the assignment
    const activeSiblings = lineItem.assignments.filter((a) => !a.deletedAt);
    const rebalance = planAddRebalance(activeSiblings);

    const assignmentResult = zero.mutate(
      mutators.assignments.insert({
        id: assignmentId,
        receipt_user_id: receiptUserId,
        receipt_line_item_id: itemId,
        share_percentage: rebalance ? rebalance.newcomerShare : null,
        locked: rebalance ? rebalance.newcomerLocked : false,
      })
    );

    const assignmentClientResult = await assignmentResult.client;
    if (assignmentClientResult.type === 'error') {
      console.error(
        'Failed to create assignment:',
        assignmentClientResult.error.message
      );
      // Rollback: soft-delete the orphaned receipt_user
      try {
        const rollbackResult = zero.mutate(
          mutators.receiptUsers.delete({ id: receiptUserId })
        );
        const rollbackClientResult = await rollbackResult.client;
        if (rollbackClientResult.type === 'error') {
          console.error(
            'Failed to rollback receipt user:',
            rollbackClientResult.error.message
          );
        }
      } catch (rollbackError) {
        console.error('Error during receipt user rollback:', rollbackError);
      }
    } else {
      console.info('Successfully created receipt user and assignment');
      if (rebalance) {
        await applySiblingUpdates(rebalance.siblingUpdates);
      }
    }
  };

  /**
   * Remove an assignment from a line item.
   */
  const removePersonAssignment = async (
    itemId: string,
    assignmentId: string
  ) => {
    if (!receipt) {
      return;
    }

    const lineItem = receipt.lineItems.find((item) => item.id === itemId);
    if (!lineItem) {
      console.error(`Line item with id ${itemId} not found`);
      return;
    }

    const removed = lineItem.assignments.find((a) => a.id === assignmentId);
    const remainingActive = lineItem.assignments.filter(
      (a) => a.id !== assignmentId && !a.deletedAt
    );

    const result = zero.mutate(
      mutators.assignments.delete({ id: assignmentId })
    );

    const clientResult = await result.client;
    if (clientResult.type === 'error') {
      console.error('Failed to delete assignment:', clientResult.error.message);
      return;
    }
    console.info('Successfully deleted assignment');

    if (removed) {
      const updates = planRemoveRebalance(removed, remainingActive);
      if (updates) {
        await applySiblingUpdates(updates);
      }
    }
  };

  const handleUpdateLineItem = async (data: UpdateLineItemData) => {
    const current = receipt?.lineItems.find((item) => item.id === data.itemId);
    const nextQuantity = data.quantity ?? current?.quantity.toNumber() ?? 1;
    const nextPricePerItem =
      data.price_per_item ?? current?.pricePerItem.toNumber() ?? 0;
    const nextTotalPrice =
      Math.round(nextQuantity * nextPricePerItem * 100) / 100;

    const result = zero.mutate(
      mutators.lineItems.update({
        id: data.itemId,
        name: data.name,
        quantity: data.quantity,
        price_per_item: data.price_per_item,
        total_price: nextTotalPrice,
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
    addExistingPersonAssignment,
    addNewPersonAssignment,
    removePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    receipt,
    receiptId,
    isReady: !!receipt && !!receiptId,
    isDeleting,
  };
}
