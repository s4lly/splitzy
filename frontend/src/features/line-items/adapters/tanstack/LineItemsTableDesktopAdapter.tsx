import LineItemsTableDesktop from '@/components/Receipt/LineItemsTableDesktop';
import type { Receipt, ReceiptLineItem } from '@/models/Receipt';
import { useTanstackLineItemMutations } from './useTanstackLineItemMutations';

export function LineItemsTableDesktopAdapter({
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
    <LineItemsTableDesktop
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
