import { useMutation, useQueryClient } from "@tanstack/react-query";
import receiptService from "../../../services/receiptService";
import { ReceiptResponseSchema } from "@/lib/receiptSchemas";
import { z } from "zod";

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
      return receiptService.updateAssignments(receiptId, lineItemId, assignments);
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
      await queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);

      queryClient.setQueryData(
        ["receipt", receiptId],
        (old: z.infer<typeof ReceiptResponseSchema>) => {
          if (!old) return old;

          const newLineItems = old.receipt.receipt_data.line_items.map((item) => {
            if (item.id === lineItemId) {
              return { ...item, assignments };
            }
            return item;
          });

          return {
            ...old,
            receipt: {
              ...old.receipt,
              receipt_data: {
                ...old.receipt.receipt_data,
                line_items: newLineItems,
              },
            },
          };
        }
      );

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["receipt", variables.receiptId],
          context.previousData
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["receipt", variables.receiptId],
      });
    },
  });
} 