import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod";

export const mutators = defineMutators({
  lineItems: {
    update: defineMutator(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        quantity: z.number().optional(),
        price_per_item: z.number().optional(),
        total_price: z.number().optional(),
        assignments: z.array(z.string()).optional(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.receipt_line_items.update(args);
      }
    ),
  },
});
