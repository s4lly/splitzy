import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { useReceiptContext } from '@/context/ReceiptContext';
import { receiptAtom } from '@/features/receipt-collab/atoms/receiptAtoms';

/**
 * Hook that syncs receipt data from React Context into Jotai.
 * This bridges the server state (Zero's useQuery via Context) with
 * the derived state layer (Jotai atoms).
 *
 * Must be used within both a ReceiptProvider and Jotai Provider.
 */
export function useReceiptSync(): void {
  const { receipt } = useReceiptContext();
  const setReceipt = useSetAtom(receiptAtom);

  useEffect(() => {
    setReceipt(receipt);
  }, [receipt, setReceipt]);
}

