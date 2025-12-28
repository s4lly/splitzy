import type { Receipt } from '@/models/Receipt';

/**
 * Generates a filename for a receipt image download based on receipt data
 * @param receipt - The receipt object (can be null)
 * @returns A sanitized filename string (default: 'receipt')
 */
export const generateImageFileName = (receipt: Receipt | null): string => {
  if (!receipt) return 'receipt';
  const merchant = receipt.merchant || '';
  const date = receipt.date ? receipt.date.toISOString().split('T')[0] : '';
  return `receipt_${merchant.replace(/\s+/g, '_').toLowerCase()}_${date}`;
};
