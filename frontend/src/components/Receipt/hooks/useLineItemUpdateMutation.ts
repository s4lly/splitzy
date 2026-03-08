import { useMutation, useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';

import {
  type LineItem,
  type ReceiptResponse,
  type UpdateLineItemPayload,
} from '@/lib/receiptSchemas';
import receiptService from '@/services/receiptService';

/**
 * Variables for updating a single line item on a receipt.
 * Extends the API payload with receipt and item identifiers.
 */
export type UpdateLineItemVariables = {
  receiptId: string;
  itemId: string;
} & UpdateLineItemPayload;

/**
 * Mutation hook to update a receipt line item (name, quantity, price, assignments).
 * Uses optimistic updates and rolls back on error.
 */
export function useLineItemUpdateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId, itemId, ...rest }: UpdateLineItemVariables) => {
      return receiptService.updateLineItem(receiptId, itemId, rest);
    },

    onMutate: async ({
      receiptId,
      itemId,
      ...rest
    }: UpdateLineItemVariables) => {
      // Prevent other queries from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      // Snapshot current receipt so we can restore it on error
      const previousData = queryClient.getQueryData<ReceiptResponse>([
        'receipt',
        receiptId,
      ]);

      try {
        queryClient.setQueryData<ReceiptResponse>(
          ['receipt', receiptId],
          (old: ReceiptResponse | undefined) => {
            if (!old) return undefined;

            return produce(old, (draft) => {
              const lineItem = draft.receipt.receipt_data.line_items.find(
                (li: LineItem) => li.id === itemId
              );
              if (!lineItem) return;

              // Patch only fields that were provided (use !== undefined so 0 and "" are applied)
              if (rest.name !== undefined) lineItem.name = rest.name;
              if (rest.quantity !== undefined)
                lineItem.quantity = rest.quantity;
              if (rest.price_per_item !== undefined)
                lineItem.price_per_item = rest.price_per_item;
              if (rest.total_price !== undefined)
                lineItem.total_price = rest.total_price;

              // API sends assignment IDs as strings; cache expects full Assignment objects
              if (rest.assignments !== undefined) {
                lineItem.assignments = rest.assignments.map(
                  (receipt_user_id): LineItem['assignments'][number] => ({
                    id: `opt-${itemId}-${receipt_user_id}`,
                    receipt_user_id,
                    receipt_line_item_id: itemId,
                    created_at: new Date().toISOString(),
                    deleted_at: null,
                    receipt_user: null,
                  })
                );
              }
            });
          }
        );
      } catch (error) {
        console.error('Error updating line item optimistically:', error);
      }

      return { previousData };
    },

    /** Restore receipt cache if the mutation fails */
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        ['receipt', variables.receiptId],
        context?.previousData
      );
    },

    /** Refetch receipt so cache matches server after success or error */
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ['receipt', variables.receiptId],
      });
    },
  });
}
