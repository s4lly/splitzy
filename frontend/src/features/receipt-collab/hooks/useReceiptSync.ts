import { useReceiptContext } from '@/context/ReceiptContext';
import { receiptRawAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

/**
 * Hook that syncs receipt data from React Context into Jotai's atom system.
 *
 * ## Why This Exists (Not Duplicating Server State)
 *
 * This hook is a **bridge**, not a copy. The receipt data flows like this:
 *
 * ```
 * Zero useQuery (server state)
 *       ↓
 * ReceiptContext (React Context - provides access without prop drilling)
 *       ↓
 * receiptRawAtom (Jotai primitive - entry point for derived atom graph)
 *       ↓
 * receiptAtom (transforms to canonical Receipt model via fromZeroReceipt)
 *       ↓
 * Derived atoms (itemSplitsAtom, personTotalsAtom, etc.)
 * ```
 *
 * **Key distinction:**
 * - The **source of truth** remains Zero's useQuery (server state)
 * - `receiptRawAtom` is a **read-only reflection** that Jotai atoms can subscribe to
 * - We're not managing receipt state in Jotai - we're enabling Jotai's derived
 *   atom system to react to server state changes
 *
 * ## Why Not Just Use Context Everywhere?
 *
 * React Context alone doesn't provide:
 * 1. **Derived state with fine-grained subscriptions** - Jotai atoms only re-render
 *    components that use specific derived values (e.g., `personTotalsAtom`)
 * 2. **Writable derived atoms** - Some derived values can be overridden locally
 *    (e.g., manual adjustments to person totals) while still having computed defaults
 * 3. **Atomic composition** - Derived atoms can depend on other derived atoms,
 *    creating a reactive computation graph
 *
 * ## Setup Requirements
 *
 * This hook must be used within a component that is wrapped by both:
 * 1. `<ReceiptProvider>` - Provides receipt from Zero's useQuery
 * 2. `<JotaiProvider>` - Provides Jotai atom store
 *
 * Typically called once in the root content component:
 *
 * ```tsx
 * const ReceiptCollabPage = () => {
 *   const [data] = useQuery(queries.receipts.byId({ id }));
 *   const [receipt] = data;
 *
 *   return (
 *     <ReceiptProvider receipt={receipt} status={status}>
 *       <JotaiProvider>
 *         <ReceiptCollabContent />  // ← useReceiptSync() called here
 *       </JotaiProvider>
 *     </ReceiptProvider>
 *   );
 * };
 *
 * const ReceiptCollabContent = () => {
 *   useReceiptSync();  // Bridge context → Jotai
 *   // ... rest of component tree can now use Jotai atoms
 * };
 * ```
 *
 * @throws Error if used outside of ReceiptProvider (from useReceiptContext)
 */
export function useReceiptSync(): void {
  const { receipt } = useReceiptContext();
  const setReceipt = useSetAtom(receiptRawAtom);

  useEffect(() => {
    setReceipt(receipt ?? null);
  }, [receipt, setReceipt]);
}
