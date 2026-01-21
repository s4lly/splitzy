import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import { useZeroLineItemMutations } from './useZeroLineItemMutations';

export function LineItemsTableMobileAdapter({ people }: { people: number[] }) {
  const {
    togglePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    receipt,
    isReady,
  } = useZeroLineItemMutations();

  if (!isReady || !receipt) {
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
