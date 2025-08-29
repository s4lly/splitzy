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
      console.log("Mutation function called with:", { receiptId, ...rest });
      return receiptService.updateReceiptData(receiptId, rest);
    },
    onMutate: ({
      receiptId,
      ...rest
    }: { receiptId: string } & Partial<
      z.infer<typeof ReceiptDataSchema>
    >) => {
      console.log("onMutate called with:", { receiptId, ...rest });
      queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);
      console.log("Previous data:", previousData);

      try {
        queryClient.setQueryData(
          ["receipt", receiptId],
          (old: z.infer<typeof ReceiptResponseSchema>) => {
            if (!old) return old;
            
            console.log("Updating cache from:", old.receipt.receipt_data);
            console.log("With updates:", rest);
            
            // Create a new immutable object structure
            const newData = {
              ...old,
              receipt: {
                ...old.receipt,
                receipt_data: {
                  ...old.receipt.receipt_data,
                  ...rest
                }
              }
            };
            
            console.log("New cache data:", newData.receipt.receipt_data);
            return newData;
          }
        );
      } catch (error) {
        console.error("Error updating receipt data:", error);
      }

      return { previousData };
    },
    onSuccess: (data, variables, context) => {
      console.log("Mutation succeeded:", data);
    },
    onError: (error, variables, context) => {
      console.error("Mutation failed:", error);
      queryClient.setQueryData(
        ["receipt", variables.receiptId],
        context?.previousData
      );
    },
    onSettled: (data, error, variables, context) => {
      console.log("Mutation settled:", { data, error, variables });
      queryClient.invalidateQueries({
        queryKey: ["receipt", variables.receiptId],
      });
    },
  });
} 