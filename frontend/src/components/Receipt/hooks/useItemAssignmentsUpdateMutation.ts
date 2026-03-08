import { useMutation, useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';
import { z } from 'zod';

import { ReceiptResponseSchema } from '@/lib/receiptSchemas';

import receiptService from '../../../services/receiptService';

export function useItemAssignmentsUpdateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      lineItemId,
      assignments,
    }: {
      receiptId: string;
      lineItemId: string;
      assignments: string[];
    }) => {
      return receiptService.updateAssignments(
        receiptId,
        lineItemId,
        assignments
      );
    },
    onMutate: async ({
      receiptId,
      lineItemId,
      assignments,
    }: {
      receiptId: string;
      lineItemId: string;
      assignments: string[];
    }) => {
      await queryClient.cancelQueries({ queryKey: ['receipt', receiptId] });

      const previousData = queryClient.getQueryData(['receipt', receiptId]);

      queryClient.setQueryData(
        ['receipt', receiptId],
        (old: z.infer<typeof ReceiptResponseSchema>) => {
          if (!old) return old;

          return produce(old, (draft) => {
            const lineItem = draft.receipt.receipt_data.line_items.find(
              (item) => item.id === lineItemId
            );
            if (!lineItem) return;

            lineItem.assignments = assignments.map(
              (receipt_user_id, idx) => ({
                id: `opt-${lineItemId}-${receipt_user_id}-${idx}`,
                receipt_user_id,
                receipt_line_item_id: lineItemId,
                created_at: new Date().toISOString(),
                deleted_at: null,
                receipt_user: null,
              })
            );
          });
        }
      );

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['receipt', variables.receiptId],
          context.previousData
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['receipt', variables.receiptId],
      });
    },
  });
}
