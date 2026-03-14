import { Trans, useLingui } from '@lingui/react/macro';
import { motion } from 'framer-motion';
import { useAtomValue } from 'jotai';
import { Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

import LineItemCard from '@/components/Receipt/components/LineItemCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillSplitSectionCollab } from '@/features/bill-split/BillSplitSectionCollab';
import { LineItemAddFormAdapter } from '@/features/line-items/adapters/zero/LineItemAddFormAdapter';
import { LineItemsTableDesktopAdapter } from '@/features/line-items/adapters/zero/LineItemsTableDesktopAdapter';
import { LineItemsTableMobileAdapter } from '@/features/line-items/adapters/zero/LineItemsTableMobileAdapter';
import { NoLineItemsMessage } from '@/features/line-items/components/NoLineItemsMessage';
import {
  assignedUsersAtom,
  receiptAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useReceiptSync } from '@/features/receipt-collab/hooks/useReceiptSync';
import { ReceiptImageViewer } from '@/features/receipt-image/ReceiptImageViewer';
import { ReceiptDetailsCard } from '@/features/receipt-viewer/ReceiptDetailsCard';
import { ReceiptSummaryCard } from '@/features/receipt-viewer/ReceiptSummaryCard';
import { ReceiptViewer } from '@/features/receipt-viewer/ReceiptViewer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMobile } from '@/hooks/useMobile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { isLocalDevelopment } from '@/utils/env';

/**
 * Inner component that has access to both ReceiptContext and Jotai.
 * This is where the sync hook runs and child components are rendered.
 */
export const ReceiptCollabContent = () => {
  // Sync receipt from Context into Jotai atoms
  useReceiptSync();

  const { t } = useLingui();
  const isMobile = useMobile();
  const receipt = useAtomValue(receiptAtom);
  const assignedUsers = useAtomValue(assignedUsersAtom);
  const receiptUserIds = assignedUsers.map((a) => a.receiptUserId);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useDocumentTitle(
    receipt
      ? receipt.merchant
        ? t`Receipt #${receipt.id} — ${receipt.merchant}`
        : t`Receipt #${receipt.id}`
      : undefined
  );

  if (!receipt) {
    return null;
  }

  return (
    <motion.div
      initial={
        shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }
      }
      className="w-full"
    >
      <div className="mx-auto max-w-3xl px-4 py-5">
        <h1 className="sr-only">
          {receipt.merchant ? (
            <Trans>Receipt — {receipt.merchant}</Trans>
          ) : (
            <Trans>Receipt details</Trans>
          )}
        </h1>
        <div className="flex flex-col gap-4">
          <ReceiptImageViewer receipt={receipt} />

          <ReceiptDetailsCard merchant={receipt.merchant} date={receipt.date} />

          {/* Items Card */}
          <Card className="overflow-hidden border-0 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)]">
            <CardHeader className="px-4 pb-2 sm:px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <Trans>Items</Trans>
                </CardTitle>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingItem(true)}
                >
                  <Plus data-icon="inline-start" />
                  <Trans>Add Item</Trans>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-5">
              {isAddingItem && (
                <LineItemCard selected={true}>
                  <LineItemAddFormAdapter
                    onAddCancel={() => setIsAddingItem(false)}
                  />
                </LineItemCard>
              )}

              {receipt.lineItems && receipt.lineItems.length > 0 ? (
                <>
                  {isMobile ? (
                    <LineItemsTableMobileAdapter people={receiptUserIds} />
                  ) : (
                    <LineItemsTableDesktopAdapter people={receiptUserIds} />
                  )}
                </>
              ) : (
                <NoLineItemsMessage merchant={receipt.merchant} />
              )}
            </CardContent>
          </Card>

          <ReceiptSummaryCard />

          <BillSplitSectionCollab />

          {isLocalDevelopment() && <ReceiptViewer />}
        </div>
      </div>
    </motion.div>
  );
};
