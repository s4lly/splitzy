import { defineMutator, defineMutators } from '@rocicorp/zero';
import { z } from 'zod';

import { zql } from './schema.js';

// ----
// Exported Zod input schemas (reusable for form validation, etc.)
// Preserve exact nullable/optional semantics — see plan notes on null vs undefined.

export const receiptsUpdateSchema = z.object({
  id: z.number(),
  tax: z.number().optional(),
  tip: z.number().optional(),
  gratuity: z.number().optional(),
  tip_after_tax: z.boolean().optional(),
  image_visibility: z.enum(['public', 'owner_only']).optional(),
});

export const receiptsSoftDeleteSchema = z.object({ id: z.number() });

export const lineItemsUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  quantity: z.number().optional(),
  price_per_item: z.number().optional(),
  total_price: z.number().optional(),
});

export const lineItemsDeleteSchema = z.object({
  id: z.string(),
});

export const lineItemsInsertSchema = z.object({
  id: z.string(),
  receipt_id: z.number(),
  name: z.string().optional(),
  quantity: z.number().optional(),
  price_per_item: z.number().optional(),
  total_price: z.number().optional(),
  created_at: z.number().optional(),
});

export const receiptUsersInsertSchema = z.object({
  id: z.string(), // ULID
  display_name: z.string(),
  created_at: z.number().optional(),
});

export const receiptUsersUpdateSchema = z.object({
  id: z.string(),
  user_id: z.number().nullish(), // null = unclaim, number = claim, undefined = no change
  display_name: z.string().optional(),
});

export const receiptUsersUpdatePaidStatusSchema = z.object({
  id: z.string(),
  paid_at: z.number().nullable(),
});

export const receiptUsersDeleteSchema = z.object({ id: z.string() }); // ULID

export const assignmentsInsertSchema = z.object({
  id: z.string(), // ULID
  receipt_user_id: z.string(), // ULID
  receipt_line_item_id: z.string(),
  created_at: z.number().optional(),
  share_percentage: z.number().min(0).max(100).nullable().optional(),
  locked: z.boolean().optional(),
});

export const assignmentsUpdateSchema = z.object({
  id: z.string(), // ULID
  share_percentage: z.number().min(0).max(100).nullable().optional(),
  locked: z.boolean().optional(),
});

export const assignmentsDeleteSchema = z.object({ id: z.string() }); // ULID

// ----

export const mutators = defineMutators({
  receipts: {
    update: defineMutator(receiptsUpdateSchema, async ({ tx, args }) => {
      await tx.mutate.user_receipts.update(args);
    }),
    softDelete: defineMutator(
      receiptsSoftDeleteSchema,
      async ({ tx, args }) => {
        await tx.mutate.user_receipts.update({
          id: args.id,
          deleted_at: Date.now(),
        });
      }
    ),
  },
  lineItems: {
    update: defineMutator(lineItemsUpdateSchema, async ({ tx, args }) => {
      await tx.mutate.receipt_line_items.update(args);
    }),
    delete: defineMutator(lineItemsDeleteSchema, async ({ tx, args }) => {
      await tx.mutate.receipt_line_items.delete({ id: args.id });
    }),
    insert: defineMutator(lineItemsInsertSchema, async ({ tx, args }) => {
      await tx.mutate.receipt_line_items.insert({
        id: args.id,
        receipt_id: args.receipt_id,
        name: args.name,
        quantity: args.quantity ?? 1,
        price_per_item: args.price_per_item ?? 0,
        total_price: args.total_price ?? 0,
        created_at: args.created_at ?? Date.now(),
      });
    }),
  },
  receiptUsers: {
    insert: defineMutator(receiptUsersInsertSchema, async ({ tx, args }) => {
      await tx.mutate.receipt_users.insert({
        id: args.id,
        display_name: args.display_name,
        created_at: args.created_at ?? Date.now(),
      });
    }),
    update: defineMutator(
      receiptUsersUpdateSchema,
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
          const [authenticatedUser] = await tx.run(
            zql.users.where('auth_user_id', ctx.userID)
          );
          if (!authenticatedUser) {
            throw new Error('Authenticated user not found');
          }

          // Validate args.user_id: must be null (unclaim) or match authenticated user
          if (args.user_id !== null && args.user_id !== authenticatedUser.id) {
            throw new Error('Cannot claim as a different user');
          }

          // Atomic conditional update: only update when row is unclaimed or already claimed by this user
          const isClaim = args.user_id !== null;
          const includeDisplayName = args.display_name !== undefined;
          let sql: string;
          let params: unknown[];
          if (isClaim) {
            if (includeDisplayName) {
              sql =
                'UPDATE receipt_users SET user_id = $1, display_name = $2 WHERE id = $3 AND (user_id IS NULL OR user_id = $1) RETURNING id';
              params = [authenticatedUser.id, args.display_name, args.id];
            } else {
              sql =
                'UPDATE receipt_users SET user_id = $1 WHERE id = $2 AND (user_id IS NULL OR user_id = $1) RETURNING id';
              params = [authenticatedUser.id, args.id];
            }
          } else {
            if (includeDisplayName) {
              sql =
                'UPDATE receipt_users SET user_id = NULL, display_name = $1 WHERE id = $2 AND (user_id IS NULL OR user_id = $3) RETURNING id';
              params = [args.display_name, args.id, authenticatedUser.id];
            } else {
              sql =
                'UPDATE receipt_users SET user_id = NULL WHERE id = $1 AND (user_id IS NULL OR user_id = $2) RETURNING id';
              params = [args.id, authenticatedUser.id];
            }
          }
          const updated = await tx.dbTransaction.query(sql, params);
          const rowCount = Array.isArray(updated) ? updated.length : 0;
          if (rowCount === 0) {
            throw new Error('Already claimed by another user');
          }

          // Apply the same change via Zero mutate so sync state is updated
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
    updatePaidStatus: defineMutator(
      receiptUsersUpdatePaidStatusSchema,
      async ({ tx, args }) => {
        await tx.mutate.receipt_users.update({
          id: args.id,
          paid_at: args.paid_at,
        });
      }
    ),
    delete: defineMutator(receiptUsersDeleteSchema, async ({ tx, args }) => {
      await tx.mutate.receipt_users.update({
        id: args.id,
        deleted_at: Date.now(),
      });
    }),
  },
  assignments: {
    insert: defineMutator(assignmentsInsertSchema, async ({ tx, args }) => {
      await tx.mutate.assignments.insert({
        id: args.id,
        receipt_user_id: args.receipt_user_id,
        receipt_line_item_id: args.receipt_line_item_id,
        created_at: args.created_at ?? Date.now(),
        share_percentage: args.share_percentage ?? undefined,
        locked: args.locked ?? false,
      });
    }),
    update: defineMutator(assignmentsUpdateSchema, async ({ tx, args }) => {
      await tx.mutate.assignments.update({
        id: args.id,
        ...(args.share_percentage !== undefined && {
          share_percentage: args.share_percentage,
        }),
        ...(args.locked !== undefined && { locked: args.locked }),
      });
    }),
    delete: defineMutator(assignmentsDeleteSchema, async ({ tx, args }) => {
      await tx.mutate.assignments.update({
        id: args.id,
        deleted_at: Date.now(),
      });
    }),
  },
});
