import LineItemCard from '@/components/Receipt/components/LineItemCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useReceiptContext } from '@/context/ReceiptContext';
import { BillSplitSectionCollab } from '@/features/bill-split/BillSplitSectionCollab';
import { LineItemAddFormAdapter } from '@/features/line-items/adapters/zero/LineItemAddFormAdapter';
import { LineItemsTableDesktopAdapter } from '@/features/line-items/adapters/zero/LineItemsTableDesktopAdapter';
import { LineItemsTableMobileAdapter } from '@/features/line-items/adapters/zero/LineItemsTableMobileAdapter';
import { NoLineItemsMessage } from '@/features/line-items/components/NoLineItemsMessage';
import {
  peopleAtom,
  receiptAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useReceiptSync } from '@/features/receipt-collab/hooks/useReceiptSync';
import { ReceiptImageViewer } from '@/features/receipt-image/ReceiptImageViewer';
import { generateImageFileName } from '@/features/receipt-image/utils/generateImageFileName';
import { ReceiptDetailsCard } from '@/features/receipt-viewer/ReceiptDetailsCard';
import { ReceiptSummaryCard } from '@/features/receipt-viewer/ReceiptSummaryCard';
import { ReceiptViewer } from '@/features/receipt-viewer/ReceiptViewer';
import { useMobile } from '@/hooks/use-mobile';
import { isLocalDevelopment } from '@/utils/env';
import { motion } from 'framer-motion';
import { useAtomValue } from 'jotai';
import { Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

/**
 * Inner component that has access to both ReceiptContext and Jotai.
 * This is where the sync hook runs and child components are rendered.
 */
export const ReceiptCollabContent = () => {
  // Sync receipt from Context into Jotai atoms
  useReceiptSync();

  const { receipt: receiptRaw } = useReceiptContext();
  const isMobile = useMobile();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const receipt = useAtomValue(receiptAtom);
  const people = useAtomValue(peopleAtom);

  if (!receipt) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="mx-auto max-w-4xl space-y-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Child components can now use:
              - useReceiptContext() for direct receipt access
              - useAtomValue(receiptTotalAtom) for derived values
              - useAtom(personTotalsAtom) for modifiable derived values
          */}

          <ReceiptImageViewer
            imageUrl={receipt.imagePath}
            fileName={generateImageFileName(receipt)}
            receiptId={receipt.id}
            imageVisibility={receiptRaw?.image_visibility}
            ownerAuthUserId={receiptRaw?.user?.auth_user_id ?? null}
          />

          <ReceiptDetailsCard merchant={receipt.merchant} date={receipt.date} />

          {/* Items Card - Second position */}
          <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
            <CardHeader className="px-3 pb-2 sm:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl font-bold">
                  <ShoppingBag className="h-6 w-6" />
                  Items
                </CardTitle>

                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingItem(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-3 sm:px-6">
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
                    <LineItemsTableMobileAdapter people={people} />
                  ) : (
                    <LineItemsTableDesktopAdapter people={people} />
                  )}
                </>
              ) : (
                <NoLineItemsMessage merchant={receipt.merchant} />
              )}
            </CardContent>
          </Card>

          <ReceiptSummaryCard />

          <BillSplitSectionCollab />

          <Separator />

          {isLocalDevelopment() && <ReceiptViewer />}
        </div>
      </div>
    </motion.div>
  );
};
