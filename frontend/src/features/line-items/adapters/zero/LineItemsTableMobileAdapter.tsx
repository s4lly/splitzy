import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import {
  receiptAtom,
  receiptIdAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useAtomValue } from 'jotai';

export function LineItemsTableMobileAdapter({
  people,
  togglePersonAssignment,
}: {
  people: string[];
  togglePersonAssignment: (itemId: string, person: string) => void;
}) {
  const receipt = useAtomValue(receiptAtom);
  const receiptId = useAtomValue(receiptIdAtom);

  // Blank handler - Zero Query mutations will be implemented in the future
  const handleUpdateLineItem = (data: {
    receiptId: string;
    itemId: string;
    name?: string;
    quantity?: number;
    price_per_item?: number;
  }) => {
    console.warn('Zero Query line item update mutation not yet implemented', {
      receiptId: data.receiptId,
      itemId: data.itemId,
      name: data.name,
      quantity: data.quantity,
      price_per_item: data.price_per_item,
    });
    // TODO: Implement Zero Query mutation for updating line items
    // This will use Zero's mutation API when available
  };

  // Blank handler - Zero Query mutations will be implemented in the future
  const handleDeleteLineItem = (
    data: {
      receiptId: string;
      itemId: string;
    },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    console.warn('Zero Query line item delete mutation not yet implemented', {
      receiptId: data.receiptId,
      itemId: data.itemId,
    });
    // TODO: Implement Zero Query mutation for deleting line items
    // This will use Zero's mutation API when available
    // options?.onSuccess?.(); // Call onSuccess when implemented
  };

  if (!receipt || !receiptId) {
    return null;
  }

  return (
    <LineItemsTableMobile
      line_items={receipt.lineItems}
      receipt={receipt}
      people={people}
      togglePersonAssignment={togglePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={false}
    />
  );
}

