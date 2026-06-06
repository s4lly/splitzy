import { defineQueries, defineQuery } from '@rocicorp/zero';
import { z } from 'zod';

import { zql } from './schema.js';

export const queries = defineQueries({
  users: {
    receipts: {
      byAuthUserId: defineQuery(z.object({}), ({ ctx }) =>
        zql.users
          .where('auth_user_id', ctx.userID ?? '')
          .related('receipts', (q) =>
            q.where('deleted_at', 'IS', null).orderBy('created_at', 'desc')
          )
          .one()
      ),
    },
  },
  receipt: {
    // TODO: remove `byId` once legacy `/receipts/:id` URLs age out past
    // LEGACY_ID_CUTOFF_ISO. It exists only to resolve sequential-id legacy
    // links to canonical share_token URLs; with no permission check it would
    // otherwise allow enumeration. Anonymous use is gated client-side in
    // LegacyReceiptRedirect, but the only durable fix is deleting this query
    // (and the legacy routes) once the cutoff window has fully expired.
    byId: defineQuery(z.object({ id: z.number() }), ({ args: { id } }) =>
      zql.user_receipts
        .where('id', id)
        .where('deleted_at', 'IS', null)
        .related('line_items', (q) =>
          q
            .where('deleted_at', 'IS', null)
            .related('assignments', (q) =>
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
    byShareToken: defineQuery(
      z.object({ token: z.string() }),
      ({ args: { token } }) =>
        zql.user_receipts
          .where('share_token', token)
          .where('deleted_at', 'IS', null)
          .related('line_items', (q) =>
            q
              .where('deleted_at', 'IS', null)
              .related('assignments', (q) =>
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
