import { z } from 'zod';

export const LineItemSchema = z.object({
  assignments: z.array(z.string()),
  id: z.string().uuid(),
  name: z.string(),
  price_per_item: z.number(),
  quantity: z.number(),
  total_price: z.number(),
});

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
  tip: z.number().nullable(),
  total: z.number().nullable(),
});

export const ReceiptSchema = z.object({
  created_at: z.string(),
  id: z.number(),
  image_path: z.string(),
  receipt_data: ReceiptDataSchema,
});

export const ReceiptResponseSchema = z.object({
  receipt: ReceiptSchema,
  success: z.boolean(),
}); 