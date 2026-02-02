import {
  createBuilder,
  createSchema,
  relationships,
  type Row,
} from '@rocicorp/zero';
import { assignment } from './schemas/assignment';
import { receiptLineItem } from './schemas/receipt-line-item';
import { receiptUser } from './schemas/receipt-user';
import { user } from './schemas/user';
import { userReceipt } from './schemas/user-receipt';

// Define relationships after all tables are imported to avoid circular dependencies
const userRelationships = relationships(user, ({ many }) => ({
  receipts: many({
    sourceField: ['id'],
    destSchema: userReceipt,
    destField: ['user_id'],
  }),
}));

const userReceiptRelationships = relationships(
  userReceipt,
  ({ one, many }) => ({
    user: one({
      sourceField: ['user_id'],
      destField: ['id'],
      destSchema: user,
    }),
    line_items: many({
      sourceField: ['id'],
      destSchema: receiptLineItem,
      destField: ['receipt_id'],
    }),
  })
);

const receiptLineItemRelationships = relationships(
  receiptLineItem,
  ({ one, many }) => ({
    receipt: one({
      sourceField: ['receipt_id'],
      destField: ['id'],
      destSchema: userReceipt,
    }),
    assignments: many({
      sourceField: ['id'],
      destSchema: assignment,
      destField: ['receipt_line_item_id'],
    }),
  })
);

const receiptUserRelationships = relationships(
  receiptUser,
  ({ one, many }) => ({
    user: one({
      sourceField: ['user_id'],
      destField: ['id'],
      destSchema: user,
    }),
    assignments: many({
      sourceField: ['id'],
      destSchema: assignment,
      destField: ['receipt_user_id'],
    }),
  })
);

const assignmentRelationships = relationships(assignment, ({ one }) => ({
  receipt_user: one({
    sourceField: ['receipt_user_id'],
    destField: ['id'],
    destSchema: receiptUser,
  }),
  line_item: one({
    sourceField: ['receipt_line_item_id'],
    destField: ['id'],
    destSchema: receiptLineItem,
  }),
}));

export const schema = createSchema({
  tables: [user, userReceipt, receiptLineItem, receiptUser, assignment],
  relationships: [
    userRelationships,
    userReceiptRelationships,
    receiptLineItemRelationships,
    receiptUserRelationships,
    assignmentRelationships,
  ],
});

export const zql = createBuilder(schema);

// ----

export type User = Row<typeof schema.tables.users>;
export type UserReceipt = Row<typeof schema.tables.user_receipts>;
export type ReceiptLineItem = Row<typeof schema.tables.receipt_line_items>;
export type ReceiptUser = Row<typeof schema.tables.receipt_users>;
export type Assignment = Row<typeof schema.tables.assignments>;

// ----

export type Schema = typeof schema;

export type AuthData = {
  userID: string | null;
};

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    schema: Schema;
    authData: AuthData;
    context: AuthData;
  }
}
