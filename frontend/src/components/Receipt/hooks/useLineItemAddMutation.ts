import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type LineItem,
  type LineItemPayload,
  type ReceiptResponse,
} from '@/lib/receiptSchemas';
import receiptService from '@/services/receiptService';

export type AddLineItemVariables = {
  receiptId: string;
  lineItemData: LineItemPayload;
};

function toLineItemPayload(
  data: Partial<LineItemPayload> & { name?: string }
): LineItemPayload {
  const quantity = data.quantity ?? 1;
  const price_per_item = data.price_per_item ?? 0;
  return {
    name: data.name ?? '',
    quantity,
    price_per_item,
    total_price: data.total_price ?? quantity * price_per_item,
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
      lineItemData:
        | LineItemPayload
        | (Partial<LineItemPayload> & { name?: string });
    }) => {
      const payload =
        'total_price' in lineItemData && lineItemData.total_price !== undefined
          ? (lineItemData as LineItemPayload)
          : toLineItemPayload(lineItemData);
      return receiptService.addLineItem(receiptId, payload);
    },
    onMutate: ({
      receiptId,
      lineItemData,
    }: {
      receiptId: string;
      lineItemData:
        | LineItemPayload
        | (Partial<LineItemPayload> & { name?: string });
    }) => {
      queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      const previousData = queryClient.getQueryData(['receipt', receiptId]);

      try {
        queryClient.setQueryData(
          ['receipt', receiptId],
          (old: ReceiptResponse) => {
            if (!old) return old;

            // Create a completely new object to ensure TanStack Query detects the change
            const newData = {
              ...old,
              receipt: {
                ...old.receipt,
                receipt_data: {
                  ...old.receipt.receipt_data,
                  line_items: [
                    {
                      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
                      name: lineItemData.name,
                      quantity: lineItemData.quantity || 1,
                      price_per_item: lineItemData.price_per_item || 0,
                      total_price: lineItemData.total_price || 0,
                      assignments: [],
                    },
                    ...old.receipt.receipt_data.line_items,
                  ],
                },
              },
            };
            return newData;
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

          // Create a completely new object to ensure TanStack Query detects the change
          const newData = {
            ...old,
            receipt: {
              ...old.receipt,
              receipt_data: {
                ...old.receipt.receipt_data,
                line_items: [
                  data.line_item, // Use the actual line item from the response
                  ...old.receipt.receipt_data.line_items.filter(
                    (li: LineItem) => !li.id.startsWith('temp-') // Remove temporary items
                  ),
                ],
              },
            },
          };
          return newData;
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
