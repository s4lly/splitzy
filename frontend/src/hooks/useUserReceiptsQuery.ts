import { fromLegacyReceipt } from '@/lib/receiptTypes';
import type { ReceiptHistoryItem } from '@/lib/receiptTypes';
import receiptService from '@/services/receiptService';
import { useSuspenseQuery } from '@tanstack/react-query';

/**
 * Query key for user receipts
 */
export const userReceiptsQueryKey = ['user-receipts'] as const;

/**
 * Hook to fetch user receipt history using TanStack Query with Suspense
 * This hook should only be used inside a Suspense boundary
 */
export function useUserReceiptsQuery() {
  const { data } = useSuspenseQuery({
    queryKey: userReceiptsQueryKey,
    queryFn: async () => {
      const response = await receiptService.getUserReceiptHistory();
      return response;
    },
  });

  // Transform the API response receipts to ReceiptHistoryItem format
  const receipts: ReceiptHistoryItem[] =
    data.receipts?.map(fromLegacyReceipt) ?? [];

  return {
    receipts,
  };
}
