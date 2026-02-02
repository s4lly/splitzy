import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import { useState } from 'react';

interface ReceiptUpdateArgs {
  id: number;
  tip?: number;
  gratuity?: number;
}

interface UseReceiptMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseReceiptMutationReturn {
  mutate: (args: ReceiptUpdateArgs) => Promise<void>;
  isSaving: boolean;
}

/**
 * Custom hook that encapsulates the common pattern for receipt mutations using Zero.
 * Handles loading state, error handling, and result processing.
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Object with mutate function and isSaving state
 *
 * @example
 * ```tsx
 * const { mutate, isSaving } = useReceiptMutation({
 *   onSuccess: () => setIsEditing(false),
 *   onError: (error) => console.error('Failed:', error)
 * });
 *
 * await mutate({ id: receiptId, tip: 10.0 });
 * ```
 */
export function useReceiptMutation(
  options?: UseReceiptMutationOptions
): UseReceiptMutationReturn {
  const zero = useZero();
  const [isSaving, setIsSaving] = useState(false);

  const mutate = async (args: ReceiptUpdateArgs) => {
    if (args.id === undefined || args.id === null) {
      const error = new Error('Receipt ID is required');
      console.error(error.message);
      options?.onError?.(error);
      return;
    }

    setIsSaving(true);
    try {
      const result = zero.mutate(mutators.receipts.update(args));

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        const error = new Error(clientResult.error.message);
        console.error('Failed to update receipt:', error.message);
        options?.onError?.(error);
      } else {
        console.info('Successfully updated receipt');
        options?.onSuccess?.();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Error updating receipt:', err);
      options?.onError?.(err);
    } finally {
      setIsSaving(false);
    }
  };

  return { mutate, isSaving };
}
