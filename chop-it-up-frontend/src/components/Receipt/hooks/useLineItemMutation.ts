import { useMutation, useQueryClient } from "@tanstack/react-query";
import receiptService from "../../../services/receiptService";
import {
  LineItemSchema,
  ReceiptResponseSchema,
} from "../../../lib/receiptSchemas";
import { z } from "zod";
import { useCallback } from "react";

export function useLineItemMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      receiptId,
      itemId,
      ...rest
    }: { receiptId: string; itemId: string } & Partial<
      z.infer<typeof LineItemSchema>
    >) => {
      return receiptService.updateLineItem(receiptId, itemId, rest);
    },
    onMutate: ({
      receiptId,
      itemId,
      ...rest
    }: { receiptId: string; itemId: string } & Partial<
      z.infer<typeof LineItemSchema>
    >) => {
      queryClient.cancelQueries({ queryKey: ["receipt", receiptId] });

      const previousData = queryClient.getQueryData(["receipt", receiptId]);

      try {
        queryClient.setQueryData(
          ["receipt", receiptId],
          (old: z.infer<typeof ReceiptResponseSchema>) => {
            const newData = { ...old };
            const item = newData.receipt.receipt_data.line_items.find(
              (item) => item.id === itemId
            );
            if (item && rest.name) {
              item.name = rest.name;
            }
            return newData;
          }
        );
      } catch (error) {
        console.error("Error updating item name:", error);
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

  const withIdentifiers = useCallback(
    (
      receiptId: string | number,
      itemId: string,
      itemObject: Partial<z.infer<typeof LineItemSchema>>
    ) => {
      mutation.mutate({
        receiptId: String(receiptId),
        itemId: itemId,
        ...itemObject,
      });
    },
    [mutation]
  );

  return {
    withIdentifiers,
    mutation,
  };
}
