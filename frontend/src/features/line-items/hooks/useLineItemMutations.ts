import { useLingui } from '@lingui/react/macro';
import { useZero } from '@rocicorp/zero/react';
import { mutators } from '@splitzy/shared-zero/mutators';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { toast } from 'sonner';
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

export function useLineItemMutations() {
  const zero = useZero();
  const { t } = useLingui();
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
      updates.map(
        (update) => zero.mutate(mutators.assignments.update(update)).client
      )
    );
    results.forEach((result, i) => {
      if (result.type === 'error') {
        console.error(
          'Failed to apply sibling rebalance update:',
          updates[i].id,
          result.error.message
        );
        toast.error(t`Failed to rebalance shares`);
      }
    });
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

    if (rebalance?.warning === 'fully-locked') {
      toast.warning(
        t`All existing shares are locked — added with 0% share. Unlock a share to give them a portion.`
      );
    }

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
      toast.error(t`Failed to add person to item`);
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
      toast.error(t`Failed to add new person`);
      return;
    }

    // Then, create the assignment
    const activeSiblings = lineItem.assignments.filter((a) => !a.deletedAt);
    const rebalance = planAddRebalance(activeSiblings);

    if (rebalance?.warning === 'fully-locked') {
      toast.warning(
        t`All existing shares are locked — added with 0% share. Unlock a share to give them a portion.`
      );
    }

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
      toast.error(t`Failed to add person to item`);
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
      toast.error(t`Failed to remove person from item`);
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
    if (!current) {
      console.error(`Line item with id ${data.itemId} not found`);
      toast.error(t`Failed to update item`);
      return;
    }
    const nextQuantity = data.quantity ?? current.quantity.toNumber();
    const nextPricePerItem =
      data.price_per_item ?? current.pricePerItem.toNumber();
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
      toast.error(t`Failed to update item`);
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
        mutators.lineItems.softDelete({
          id: data.itemId,
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error(
          'Failed to delete line item:',
          clientResult.error.message
        );
        toast.error(t`Failed to delete item`);
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
