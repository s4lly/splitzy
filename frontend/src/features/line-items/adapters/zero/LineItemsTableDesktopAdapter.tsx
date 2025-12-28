import LineItemsTableDesktop from '@/components/Receipt/LineItemsTableDesktop';
import { useZeroLineItemMutations } from './useZeroLineItemMutations';

export function LineItemsTableDesktopAdapter({ people }: { people: string[] }) {
  const {
    togglePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    receipt,
    isReady,
    isDeleting,
  } = useZeroLineItemMutations();

  if (!isReady || !receipt) {
    return null;
  }

  return (
    <LineItemsTableDesktop
      line_items={receipt.lineItems}
      receipt={receipt}
      people={people}
      togglePersonAssignment={togglePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={isDeleting}
    />
  );
}
