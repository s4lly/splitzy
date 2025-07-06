import { useMutation, useQueryClient } from '@tanstack/react-query';
import receiptService from '../../services/receiptService';

export function useUpdateItemAssignmentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId, lineItems }) => {
      return receiptService.updateAssignments(receiptId, lineItems);
    },
    onMutate: ({ receiptId, lineItems }) => {
      queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);

      try {
        queryClient.setQueryData(["receipt", receiptId], (old) => {
          const newData = { ...old };
          newData.receipt.receipt_data.line_items = lineItems;
        });
      } catch (error) {
        console.error("Error updating item assignments:", error);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        ["receipt", variables.receiptId],
        context.previousData
      );
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["receipt", variables.receiptId],
      });
    },
  });
} 