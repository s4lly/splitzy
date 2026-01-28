import { defineQueries, defineQuery } from '@rocicorp/zero';
import { z } from 'zod';
import { zql } from './schema';

export const queries = defineQueries({
  users: {
    receipts: {
      byAuthUserId: defineQuery(z.object({}), ({ ctx }) =>
        zql.users
          .where('auth_user_id', ctx.userID ?? '')
          .related('receipts', (q) => q.orderBy('created_at', 'desc'))
          .one()
      ),
    },
  },
  receipt: {
    byId: defineQuery(z.object({ id: z.number() }), ({ args: { id } }) =>
      zql.user_receipts
        .where('id', id)
        .related('line_items', (q) =>
          q.related('assignments', (q) =>
            q
              .where('deleted_at', 'IS', null)
              .related('receipt_user', (q) =>
                q.where('deleted_at', 'IS', null).related('user')
              )
          )
        )
        .related('user')
        .one()
    ),
  },
});
