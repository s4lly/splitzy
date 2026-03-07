import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type LineItem,
  type ReceiptResponse,
  type UpdateLineItemPayload,
} from '@/lib/receiptSchemas';
import receiptService from '@/services/receiptService';

export type UpdateLineItemVariables = {
  receiptId: string;
  itemId: string;
} & UpdateLineItemPayload;

export function useLineItemUpdateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      itemId,
      ...rest
    }: UpdateLineItemVariables) => {
      return receiptService.updateLineItem(receiptId, itemId, rest);
    },
    onMutate: ({
      receiptId,
      itemId,
      ...rest
    }: UpdateLineItemVariables) => {
      queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      const previousData = queryClient.getQueryData(['receipt', receiptId]);

      try {
        queryClient.setQueryData(
          ['receipt', receiptId],
          (old: ReceiptResponse) => {
            const newData = { ...old };
            const item = newData.receipt.receipt_data.line_items.find(
              (li: LineItem) => li.id === itemId
            );
            if (item && rest.name) {
              item.name = rest.name;
            }
            return newData;
          }
        );
      } catch (error) {
        console.error('Error updating item name:', error);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        ['receipt', variables.receiptId],
        context?.previousData
      );
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ['receipt', variables.receiptId],
      });
    },
  });
}
