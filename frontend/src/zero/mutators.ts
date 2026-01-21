import { defineMutator, defineMutators } from '@rocicorp/zero';
import { z } from 'zod';

export const mutators = defineMutators({
  receipts: {
    update: defineMutator(
      z.object({
        id: z.number(),
        tip: z.number().optional(),
        gratuity: z.number().optional(),
        image_visibility: z
          .enum(['public', 'owner_only'])
          .optional()
      }),
      async ({ tx, args }) => {
        await tx.mutate.user_receipts.update(args);
      }
    ),
  },
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
          created_at: args.created_at ?? Date.now(),
        });
      }
    ),
  },
});
