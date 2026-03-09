import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  auth_user_id: z.string(),
  display_name: z.string().nullable(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
});

export const ReceiptUserSchema = z.object({
  id: z.string(), // ULID
  user_id: z.number().nullable(),
  display_name: z.string().nullable(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
  user: UserSchema.nullable().optional(),
});

export const AssignmentSchema = z.object({
  id: z.string(), // ULID
  receipt_user_id: z.string(), // ULID
  receipt_line_item_id: z.string().uuid(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
  receipt_user: ReceiptUserSchema.nullable(),
});

export const LineItemSchema = z.object({
  assignments: z.array(AssignmentSchema).default([]),
  id: z.string().uuid(),
  name: z.string(),
  price_per_item: z.number(),
  quantity: z.number(),
  total_price: z.number(),
});
export type LineItem = z.infer<typeof LineItemSchema>;

export const ReceiptDataSchema = z.object({
  date: z.string().nullable(),
  display_subtotal: z.number().nullable(),
  final_total: z.number().nullable(),
  gratuity: z.number().nullable(),
  is_receipt: z.boolean(),
  items_total: z.number().nullable(),
  line_items: z.array(LineItemSchema),
  merchant: z.string().nullable(),
  payment_method: z.string().nullable(),
  posttax_total: z.number().nullable(),
  pretax_total: z.number().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tax_included_in_items: z.boolean(),
  tip_after_tax: z.boolean().optional().default(false),
  tip: z.number().nullable(),
  total: z.number().nullable(),
});

export const ReceiptSchema = z.object({
  created_at: z.string(),
  id: z.number(),
  image_path: z.string(),
  image_visibility: z.enum(['public', 'owner_only']).default('public'),
  receipt_data: ReceiptDataSchema,
});

export const ReceiptResponseSchema = z.object({
  receipt: ReceiptSchema,
  success: z.boolean(),
});
export type ReceiptResponse = z.infer<typeof ReceiptResponseSchema>;

// Schema for receipt items in the history list endpoint
export const ReceiptHistoryItemAPISchema = z.object({
  id: z.number(),
  receipt_data: ReceiptDataSchema.partial().nullable(), // Allow partial fields and null
  image_path: z.string().nullable(),
  created_at: z.string(),
});

export const UserReceiptsResponseSchema = z.object({
  success: z.boolean(),
  receipts: z.array(ReceiptHistoryItemAPISchema),
});

// ---------------------------------------------------------------------------
// Request payload schemas (for API mutation calls)
// ---------------------------------------------------------------------------

/** Refinement: at least one property must be present (not undefined). Matches backend "if not data" rejection. */
const atLeastOneField = <T extends Record<string, unknown>>(obj: T) =>
  Object.values(obj).some((v) => v !== undefined);

const atLeastOneFieldMessage = 'At least one field must be provided for update';

/** Payload for POST /user/receipts/:id/line-items (add line item). Matches backend LineItem. */
export const LineItemPayloadSchema = z.object({
  name: z.string(),
  quantity: z.number().default(1),
  price_per_item: z.number().default(0),
  total_price: z.number().default(0),
  assignments: z.array(z.string()).default([]),
});
export type LineItemPayload = z.infer<typeof LineItemPayloadSchema>;

/**
 * Payload for PUT /user/receipts/:id/line-items/:itemId (update line item).
 * Backend allowlist: name, quantity, price_per_item, total_price, assignments.
 * Empty objects are rejected at runtime via refinement; for compile-time "at least one key"
 * you could use ts-essentials' RequireAtLeastOne<UpdateLineItemPayload, keyof UpdateLineItemPayload>.
 */
export const UpdateLineItemPayloadSchema = z
  .object({
    name: z.string().optional(),
    quantity: z.number().optional(),
    price_per_item: z.number().optional(),
    total_price: z.number().optional(),
    assignments: z.array(z.string()).optional(),
  })
  .refine(atLeastOneField, { message: atLeastOneFieldMessage });
export type UpdateLineItemPayload = z.infer<typeof UpdateLineItemPayloadSchema>;

/**
 * Payload for PUT /user/receipts/:id/receipt-data (update receipt data). Excludes line_items, id, user_id, created_at.
 * Empty objects are rejected at runtime via refinement; for compile-time enforcement, ts-essentials RequireAtLeastOne could be used.
 */
export const UpdateReceiptPayloadSchema = ReceiptDataSchema.omit({
  line_items: true,
})
  .partial()
  .refine(atLeastOneField, { message: atLeastOneFieldMessage });
export type UpdateReceiptPayload = z.infer<typeof UpdateReceiptPayloadSchema>;
