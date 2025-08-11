import { useMutation, useQueryClient } from "@tanstack/react-query";
import receiptService from "../../../services/receiptService";
import { LineItemSchema, ReceiptResponseSchema } from "@/lib/receiptSchemas";
import { z } from "zod";

export function useItemAssignmentsUpdateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      lineItems,
    }: {
      receiptId: string;
      lineItems: z.infer<typeof LineItemSchema>[];
    }) => {
      return receiptService.updateAssignments(receiptId, lineItems);
    },
    onMutate: ({
      receiptId,
      lineItems,
    }: {
      receiptId: string;
      lineItems: z.infer<typeof LineItemSchema>[];
    }) => {
      queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);

      try {
        queryClient.setQueryData(
          ["receipt", receiptId],
          (old: z.infer<typeof ReceiptResponseSchema>) => {
            const newData = { ...old };
            newData.receipt.receipt_data.line_items = lineItems;
            return newData;
          }
        );
      } catch (error) {
        console.error("Error updating item assignments:", error);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        ["receipt", variables.receiptId],
        context?.previousData
      );
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["receipt", variables.receiptId],
      });
    },
  });
} 