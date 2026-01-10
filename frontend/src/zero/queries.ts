import { defineQueries, defineQuery } from '@rocicorp/zero';
import { z } from 'zod';
import { zql } from './schema';

export const queries = defineQueries({
  users: {
    receipts: {
      byAuthUserId: defineQuery(
        z.object({ authUserId: z.string() }),
        ({ args: { authUserId } }) =>
          zql.users
            .where('auth_user_id', authUserId)
            .related('receipts', (q) => q.orderBy('created_at', 'desc'))
            .one()
      ),
    },
  },
  receipts: {
    byId: defineQuery(z.object({ id: z.number() }), ({ args: { id } }) =>
      zql.user_receipts.where('id', id).related('line_items')
    ),
  },
});
