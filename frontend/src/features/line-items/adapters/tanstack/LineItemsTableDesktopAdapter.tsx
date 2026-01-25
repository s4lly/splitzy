import LineItemsTableDesktop from '@/components/Receipt/LineItemsTableDesktop';
import type { Receipt } from '@/models/Receipt';
import type { ReceiptLineItem } from '@/models/ReceiptLineItem';
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
    addExistingPersonAssignment,
    addNewPersonAssignment,
    removePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    isDeleting,
  } = useTanstackLineItemMutations(receipt);

  // Collect all assignments from line_items
  const allAssignments = line_items.flatMap((item) => item.assignments);

  return (
    <LineItemsTableDesktop
      line_items={line_items}
      receipt={receipt}
      people={people}
      addExistingPersonAssignment={addExistingPersonAssignment}
      addNewPersonAssignment={addNewPersonAssignment}
      removePersonAssignment={removePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={isDeleting}
      allAssignments={allAssignments}
    />
  );
}
