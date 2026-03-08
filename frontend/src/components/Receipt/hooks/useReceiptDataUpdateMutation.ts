import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ReceiptResponse,
  type UpdateReceiptPayload,
} from '@/lib/receiptSchemas';
import receiptService from '@/services/receiptService';

export type UpdateReceiptDataVariables = {
  receiptId: string;
} & UpdateReceiptPayload;

export function useReceiptDataUpdateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId, ...rest }: UpdateReceiptDataVariables) => {
      return receiptService.updateReceiptData(receiptId, rest);
    },
    onMutate: async ({ receiptId, ...rest }: UpdateReceiptDataVariables) => {
      // Cancel any in-flight queries to prevent races
      await queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      const previousData = queryClient.getQueryData<ReceiptResponse>([
        'receipt',
        receiptId,
      ]);

      try {
        queryClient.setQueryData(
          ['receipt', receiptId],
          (old: ReceiptResponse | undefined) => {
            if (!old) return old;

            // Create a new immutable object structure
            const newData = {
              ...old,
              receipt: {
                ...old.receipt,
                receipt_data: {
                  ...old.receipt.receipt_data,
                  ...rest,
                },
              },
            };

            return newData;
          }
        );
      } catch (error) {
        console.error('Error updating receipt data:', error);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context && context.previousData) {
        queryClient.setQueryData(
          ['receipt', variables.receiptId],
          context.previousData
        );
      } else {
        queryClient.invalidateQueries({
          queryKey: ['receipt', variables.receiptId],
        });
      }
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ['receipt', variables.receiptId],
      });
    },
  });
}
