import LineItemAddForm from '@/components/Receipt/LineItemAddForm';
import { receiptIdAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import { useAtomValue } from 'jotai';

export function LineItemAddFormAdapter({
  onAddCancel,
}: {
  onAddCancel: () => void;
}) {
  const receiptId = useAtomValue(receiptIdAtom);

  // Blank handler - Zero Query mutations will be implemented in the future
  const handleAddLineItem = (data: {
    receiptId: string;
    lineItemData: {
      name?: string;
      quantity?: number;
      price_per_item?: number;
    };
  }) => {
    console.warn('Zero Query line item add mutation not yet implemented', {
      receiptId: data.receiptId,
      lineItemData: data.lineItemData,
    });
    // TODO: Implement Zero Query mutation for adding line items
    // This will use Zero's mutation API when available
  };

  if (!receiptId) {
    return null;
  }

  return (
    <LineItemAddForm
      receiptId={receiptId}
      onAddCancel={onAddCancel}
      onAddLineItem={handleAddLineItem}
      isPending={false}
    />
  );
}

