import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import { useZeroLineItemMutations } from './useZeroLineItemMutations';

export function LineItemsTableMobileAdapter({ people }: { people: string[] }) {
  const {
    addExistingPersonAssignment,
    addNewPersonAssignment,
    removePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    receipt,
    isReady,
  } = useZeroLineItemMutations();

  if (!isReady || !receipt) {
    return null;
  }

  const allAssignments = receipt.lineItems.flatMap((item) => item.assignments);

  return (
    <LineItemsTableMobile
      line_items={receipt.lineItems}
      receipt={receipt}
      people={people}
      addExistingPersonAssignment={addExistingPersonAssignment}
      addNewPersonAssignment={addNewPersonAssignment}
      removePersonAssignment={removePersonAssignment}
      onUpdateLineItem={handleUpdateLineItem}
      onDeleteLineItem={handleDeleteLineItem}
      isDeleting={false}
      allAssignments={allAssignments}
    />
  );
}
