import type { UserReceipt } from '@/zero/schema';
import { z } from 'zod';

/**
 * Shared schema for receipt history items displayed in the UI
 * This unified type works for both Zero Query and TanStack Query data sources
 */
export const ReceiptHistoryItemSchema = z.object({
  id: z.number(),
  merchant: z.string().nullable(),
  total: z.number().nullable(),
  date: z.date().nullable(),
  created_at: z.date(),
});

export type ReceiptHistoryItem = z.infer<typeof ReceiptHistoryItemSchema>;

/**
 * Transform Zero Query UserReceipt to ReceiptHistoryItem
 * Zero Query uses flat fields and created_at is a number timestamp
 */
export function fromZeroReceipt(receipt: UserReceipt): ReceiptHistoryItem {
  return {
    id: receipt.id,
    merchant: receipt.merchant ?? null,
    total: receipt.total ?? null,
    date: receipt.date ? new Date(receipt.date) : null,
    created_at: new Date(receipt.created_at),
  };
}

/**
 * Transform legacy API receipt (with nested receipt_data) to ReceiptHistoryItem
 * Legacy API uses nested receipt_data and created_at is already an ISO string
 */
export function fromLegacyReceipt(receipt: {
  id: number;
  receipt_data?: {
    merchant?: string | null;
    total?: number | null;
    date?: string | null;
  } | null;
  created_at: string;
}): ReceiptHistoryItem {
  return {
    id: receipt.id,
    merchant: receipt.receipt_data?.merchant ?? null,
    total: receipt.receipt_data?.total ?? null,
    date: receipt.receipt_data?.date
      ? new Date(receipt.receipt_data.date)
      : null,
    created_at: new Date(receipt.created_at),
  };
}
