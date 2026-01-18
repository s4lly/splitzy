import { ReceiptLineItem, User, UserReceipt } from '@/zero/schema';
import { ReactNode, createContext, useContext } from 'react';

/**
 * Receipt with related line items and user from Zero query
 */
export type ReceiptWithLineItems = UserReceipt & {
  line_items: readonly ReceiptLineItem[];
  user?: User | null;
};

/**
 * Query status type matching Zero's useQuery details.type
 */
export type QueryStatus = 'unknown' | 'complete' | 'error';

interface ReceiptContextValue {
  receipt: ReceiptWithLineItems | null;
  status: QueryStatus;
  isLoading: boolean;
  isError: boolean;
}

const ReceiptContext = createContext<ReceiptContextValue | null>(null);

interface ReceiptProviderProps {
  children: ReactNode;
  receipt: ReceiptWithLineItems | null | undefined;
  status: QueryStatus;
}

/**
 * Provider component that wraps Zero's useQuery result
 * and provides receipt data to all child components.
 */
export function ReceiptProvider({
  children,
  receipt,
  status,
}: ReceiptProviderProps) {
  const value: ReceiptContextValue = {
    receipt: receipt ?? null,
    status,
    isLoading: status === 'unknown',
    isError: status === 'error',
  };

  return (
    <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>
  );
}

/**
 * Hook to access receipt data from context.
 * Must be used within a ReceiptProvider.
 */
export function useReceiptContext(): ReceiptContextValue {
  const context = useContext(ReceiptContext);

  if (!context) {
    throw new Error('useReceiptContext must be used within a ReceiptProvider');
  }

  return context;
}

/**
 * Hook to access receipt data, throws if receipt is not available.
 * Use when you know the receipt should be loaded.
 */
export function useReceipt(): ReceiptWithLineItems {
  const { receipt, isLoading, isError } = useReceiptContext();

  if (isLoading) {
    throw new Error('Receipt is still loading');
  }

  if (isError) {
    throw new Error('Failed to load receipt');
  }

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  return receipt;
}
