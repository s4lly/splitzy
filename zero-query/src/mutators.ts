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
    delete: defineMutator(
      z.object({
        id: z.string(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.receipt_line_items.delete({ id: args.id });
      }
    ),
    insert: defineMutator(
      z.object({
        id: z.string(),
        receipt_id: z.number(),
        name: z.string().optional(),
        quantity: z.number().optional(),
        price_per_item: z.number().optional(),
        total_price: z.number().optional(),
        assignments: z.array(z.string()).optional(),
        created_at: z.number().optional(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.receipt_line_items.insert({
          id: args.id,
          receipt_id: args.receipt_id,
          name: args.name,
          quantity: args.quantity ?? 1,
          price_per_item: args.price_per_item ?? 0,
          total_price: args.total_price ?? 0,
          assignments: args.assignments,
          created_at: args.created_at ?? Date.now(),
        });
      }
    ),
  },
});
