import {
  boolean,
  createBuilder,
  createSchema,
  json,
  number,
  relationships,
  string,
  table,
  type Row,
} from "@rocicorp/zero";

const userReceipt = table("user_receipts")
  .columns({
    id: number(),
    user_id: number().optional(),
    image_path: string().optional(),
    created_at: number(),
    is_receipt: boolean().optional(),
    document_type: string().optional(),
    merchant: string().optional(),
    date: number().optional(),
    subtotal: number().optional(),
    tax: number().optional(),
    tip: number().optional(),
    gratuity: number().optional(),
    total: number().optional(),
    payment_method: string().optional(),
    tax_included_in_items: boolean().optional(),
    display_subtotal: number().optional(),
    items_total: number().optional(),
    pretax_total: number().optional(),
    posttax_total: number().optional(),
    final_total: number().optional(),
    carrier: string().optional(),
    ticket_number: string().optional(),
    origin: string().optional(),
    destination: string().optional(),
    passenger: string().optional(),
    class_: string().from("class").optional(),
    fare: number().optional(),
    currency: string().optional(),
    taxes: number().optional(),
    receipt_metadata: json().optional(),
  })
  .primaryKey("id");

const receiptLineItem = table("receipt_line_items")
  .columns({
    id: string(), // UUID maps to string in Zero
    receipt_id: number(), // Foreign key to user_receipts.id
    name: string().optional(),
    quantity: number(),
    price_per_item: number(),
    total_price: number(),
    assignments: json().optional(),
    created_at: number(),
  })
  .primaryKey("id");

// ----

const userReceiptRelationships = relationships(userReceipt, ({ many }) => ({
  line_items: many({
    sourceField: ["id"],
    destSchema: receiptLineItem,
    destField: ["receipt_id"],
  }),
}));

const receiptLineItemRelationships = relationships(
  receiptLineItem,
  ({ one }) => ({
    receipt: one({
      sourceField: ["receipt_id"],
      destField: ["id"],
      destSchema: userReceipt,
    }),
  })
);

// ----

export const schema = createSchema({
  tables: [userReceipt, receiptLineItem],
  relationships: [userReceiptRelationships, receiptLineItemRelationships],
});

export const zql = createBuilder(schema);

// ----

export type UserReceipt = Row<typeof schema.tables.user_receipts>;
export type ReceiptLineItem = Row<typeof schema.tables.receipt_line_items>;

// ----

export type Schema = typeof schema;

export type AuthData = {
  userID: string | null;
};

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    schema: Schema;
    authData: AuthData;
  }
}
