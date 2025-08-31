import { useMutation, useQueryClient } from '@tanstack/react-query';
import receiptService from '@/services/receiptService';
import { ReceiptResponseSchema } from '@/lib/receiptSchemas';
import { z } from 'zod';

export function useLineItemDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      itemId,
    }: {
      receiptId: string;
      itemId: string;
    }) => {
      return receiptService.deleteLineItem(receiptId, itemId);
    },
    onMutate: ({
      receiptId,
      itemId,
    }: {
      receiptId: string;
      itemId: string;
    }) => {
      queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      const previousData = queryClient.getQueryData(['receipt', receiptId]);

      try {
        queryClient.setQueryData(
          ['receipt', receiptId],
          (old: z.infer<typeof ReceiptResponseSchema>) => {
            // Create a completely new object to ensure TanStack Query detects the change
            const newData = {
              ...old,
              receipt: {
                ...old.receipt,
                receipt_data: {
                  ...old.receipt.receipt_data,
                  line_items: old.receipt.receipt_data.line_items.filter(
                    (item) => item.id !== itemId
                  ),
                },
              },
            };
            return newData;
          }
        );
      } catch (error) {
        console.error('Error removing line item:', error);
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
      // Ensure the cache is properly updated after successful deletion
      queryClient.setQueryData(
        ['receipt', variables.receiptId],
        (old: z.infer<typeof ReceiptResponseSchema>) => {
          if (!old) return old;
          // Create a completely new object to ensure TanStack Query detects the change
          const newData = {
            ...old,
            receipt: {
              ...old.receipt,
              receipt_data: {
                ...old.receipt.receipt_data,
                line_items: old.receipt.receipt_data.line_items.filter(
                  (item) => item.id !== variables.itemId
                ),
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
