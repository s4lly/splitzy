import { useMutation, useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';

import {
  type LineItem,
  type LineItemPayload,
  type ReceiptResponse,
} from '@/lib/receiptSchemas';
import receiptService from '@/services/receiptService';

/** Draft for add: name required; other fields optional. total_price is always computed. */
export type DraftLineItemPayload = Partial<LineItemPayload> & { name: string };

export type AddLineItemVariables = {
  receiptId: string;
  lineItemData: LineItemPayload;
};

function toLineItemPayload(
  data: LineItemPayload | DraftLineItemPayload
): LineItemPayload {
  const quantity = data.quantity ?? 1;
  const price_per_item = data.price_per_item ?? 0;
  const total_price = quantity * price_per_item;
  return {
    name: data.name,
    quantity,
    price_per_item,
    total_price,
    assignments: data.assignments ?? [],
  };
}

export function useLineItemAddMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      lineItemData,
    }: {
      receiptId: string;
      lineItemData: LineItemPayload | DraftLineItemPayload;
    }) => {
      const payload = toLineItemPayload(lineItemData);
      return receiptService.addLineItem(receiptId, payload);
    },
    onMutate: ({
      receiptId,
      lineItemData,
    }: {
      receiptId: string;
      lineItemData: LineItemPayload | DraftLineItemPayload;
    }) => {
      queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      const previousData = queryClient.getQueryData(['receipt', receiptId]);

      const payload = toLineItemPayload(lineItemData);

      try {
        queryClient.setQueryData(
          ['receipt', receiptId],
          (old: ReceiptResponse) => {
            if (!old) return old;

            const tempId = `temp-${Date.now()}`;
            return produce(old, (draft) => {
              draft.receipt.receipt_data.line_items.unshift({
                id: tempId,
                name: payload.name,
                quantity: payload.quantity,
                price_per_item: payload.price_per_item,
                total_price: payload.total_price,
                assignments: payload.assignments.map(
                  (receipt_user_id, idx): LineItem['assignments'][number] => ({
                    id: `opt-${tempId}-${receipt_user_id}-${idx}`,
                    receipt_user_id,
                    receipt_line_item_id: tempId,
                    created_at: new Date().toISOString(),
                    deleted_at: null,
                    receipt_user: null,
                  })
                ),
              });
            });
          }
        );
      } catch (error) {
        console.error('Error adding line item:', error);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Restore the previous data on error
      queryClient.setQueryData(
        ['receipt', variables.receiptId],
        context?.previousData
      );
    },
    onSuccess: (data, variables, context) => {
      // Update the cache with the actual response data
      queryClient.setQueryData(
        ['receipt', variables.receiptId],
        (old: ReceiptResponse) => {
          if (!old) return old;

          return produce(old, (draft) => {
            const withoutTemps = draft.receipt.receipt_data.line_items.filter(
              (li: LineItem) => !li.id.startsWith('temp-')
            );
            draft.receipt.receipt_data.line_items = [
              data.line_item,
              ...withoutTemps,
            ];
          });
        }
      );
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate and refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ['receipt', variables.receiptId],
      });
    },
  });
}
