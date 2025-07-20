import { useMutation, useQueryClient } from "@tanstack/react-query";
import receiptService from "@/services/receiptService";
import { ReceiptDataSchema, ReceiptResponseSchema } from "@/lib/receiptSchemas";
import { z } from "zod";

export function useReceiptDataUpdateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      ...rest
    }: { receiptId: string } & Partial<
      z.infer<typeof ReceiptDataSchema>
    >) => {
      return receiptService.updateReceiptData(receiptId, rest);
    },
    onMutate: ({
      receiptId,
      ...rest
    }: { receiptId: string } & Partial<
      z.infer<typeof ReceiptDataSchema>
    >) => {
      queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);

      try {
        queryClient.setQueryData(
          ["receipt", receiptId],
          (old: z.infer<typeof ReceiptResponseSchema>) => {
            const newData = { ...old };
            // Update receipt_data properties
            Object.assign(newData.receipt.receipt_data, rest);
            return newData;
          }
        );
      } catch (error) {
        console.error("Error updating receipt data:", error);
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