import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import type { Receipt, ReceiptLineItem } from '@/models/Receipt';
import { useTanstackLineItemMutations } from './useTanstackLineItemMutations';

export function LineItemsTableMobileAdapter({
  line_items,
  receipt,
  people,
}: {
  line_items: readonly ReceiptLineItem[];
  receipt: Receipt;
  people: string[];
}) {
  const {
    togglePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    isDeleting,
  } = useTanstackLineItemMutations(receipt);

  return (
    <LineItemsTableMobile
      line_items={line_items}
      receipt={receipt}
      people={people}
      togglePersonAssignment={togglePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={isDeleting}
    />
  );
}
