import type { ReceiptHistoryItem } from '@/lib/receiptTypes';
import { fromLegacyReceipt } from '@/lib/receiptTypes';
import receiptService from '@/services/receiptService';
import { useAuth } from '@clerk/clerk-react';
import { useSuspenseQuery } from '@tanstack/react-query';

/**
 * Query key factory for user receipts
 * @param userId - The user identifier to include in the query key
 * @returns The query key array with user identifier
 */
export const getUserReceiptsQueryKey = (userId?: string) =>
  ['user-receipts', userId] as const;

/**
 * Hook to fetch user receipt history using TanStack Query with Suspense
 * This hook should only be used inside a Suspense boundary
 */
export function useUserReceiptsQuery() {
  const { getToken, userId } = useAuth();

  const { data } = useSuspenseQuery({
    queryKey: getUserReceiptsQueryKey(userId ?? undefined),
    queryFn: async () => {
      let token: string | null = null;
      try {
        token = await getToken();
      } catch (error) {
        console.error('Error retrieving token:', error);
        // Continue without token - let the backend handle authentication
      }

      const tokenToUse = token || undefined;
      return receiptService.getUserReceiptHistory({ token: tokenToUse });
    },
  });

  // Transform the API response receipts to ReceiptHistoryItem format
  const receipts: ReceiptHistoryItem[] =
    data.receipts?.map(fromLegacyReceipt) ?? [];

  return {
    receipts,
  };
}
