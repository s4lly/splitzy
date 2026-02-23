import { defineMutator, defineMutators } from '@rocicorp/zero';
import { z } from 'zod';

import { zql } from './schema.js';

export const mutators = defineMutators({
  receipts: {
    update: defineMutator(
      z.object({
        id: z.number(),
        tip: z.number().optional(),
        gratuity: z.number().optional(),
        image_visibility: z.enum(['public', 'owner_only']).optional(),
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
  receiptUsers: {
    insert: defineMutator(
      z.object({
        id: z.string(), // ULID
        display_name: z.string(),
        created_at: z.number().optional(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.receipt_users.insert({
          id: args.id,
          display_name: args.display_name,
          created_at: args.created_at ?? Date.now(),
        });
      }
    ),
    update: defineMutator(
      z.object({
        id: z.string(),
        user_id: z.number().nullish(), // null = unclaim, number = claim, undefined = no change
        display_name: z.string().optional(),
      }),
      async ({ tx, args, ctx }) => {
        // When user_id isn't being changed, allow the update as-is on both client and server
        if (args.user_id === undefined) {
          await tx.mutate.receipt_users.update(args);
          return;
        }

        if (tx.location === 'server') {
          if (!ctx.userID) {
            throw new Error('Authentication required to change claim');
          }

          // Resolve Clerk auth ID -> numeric user ID
          const users = await tx.run(
            zql.users.where('auth_user_id', ctx.userID)
          );
          const authenticatedUser = Array.isArray(users) ? users[0] : users;
          if (!authenticatedUser) {
            throw new Error('Authenticated user not found');
          }

          // Validate args.user_id: must be null (unclaim) or match authenticated user
          if (args.user_id !== null && args.user_id !== authenticatedUser.id) {
            throw new Error('Cannot claim as a different user');
          }

          // Prevent overwriting another user's existing claim
          const rows = await tx.run(zql.receipt_users.where('id', args.id));
          const existing = Array.isArray(rows) ? rows[0] : rows;
          if (
            existing?.user_id != null &&
            existing.user_id !== authenticatedUser.id
          ) {
            throw new Error('Already claimed by another user');
          }

          // Use authenticated numeric user ID instead of caller-supplied value
          await tx.mutate.receipt_users.update({
            id: args.id,
            ...(args.display_name !== undefined && {
              display_name: args.display_name,
            }),
            user_id: args.user_id === null ? null : authenticatedUser.id,
          });
        } else {
          // Client-side optimistic update -- trust the args
          await tx.mutate.receipt_users.update(args);
        }
      }
    ),
  },
  assignments: {
    insert: defineMutator(
      z.object({
        id: z.string(), // ULID
        receipt_user_id: z.string(), // ULID
        receipt_line_item_id: z.string(),
        created_at: z.number().optional(),
      }),
      async ({ tx, args }) => {
        await tx.mutate.assignments.insert({
          id: args.id,
          receipt_user_id: args.receipt_user_id,
          receipt_line_item_id: args.receipt_line_item_id,
          created_at: args.created_at ?? Date.now(),
        });
      }
    ),
    delete: defineMutator(
      z.object({ id: z.string() }), // ULID
      async ({ tx, args }) => {
        await tx.mutate.assignments.update({
          id: args.id,
          deleted_at: Date.now(),
        });
      }
    ),
  },
});
