import { useMutation, useQueryClient } from '@tanstack/react-query';
import receiptService from '../../services/receiptService';

export function useUpdateLineItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId, itemId, ...rest }) => {
      return receiptService.updateLineItem(receiptId, itemId, rest);
    },
    onMutate: ({ receiptId, itemId, ...rest }) => {
      queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);

      try {
        queryClient.setQueryData(["receipt", receiptId], (old) => {
          const newData = { ...old };
          const item = newData.receipt.receipt_data.line_items.find(
            (item) => item.id === itemId
          );
          if (item) {
            item.name = rest.name;
          }
        });
      } catch (error) {
        console.error("Error updating item name:", error);
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