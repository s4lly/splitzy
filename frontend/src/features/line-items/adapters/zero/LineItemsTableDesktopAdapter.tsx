import LineItemsTableDesktop from '@/components/Receipt/LineItemsTableDesktop';
import { useZeroLineItemMutations } from './useZeroLineItemMutations';

export function LineItemsTableDesktopAdapter({ people }: { people: string[] }) {
  const {
    addExistingPersonAssignment,
    addNewPersonAssignment,
    removePersonAssignment,
    handleUpdateLineItem,
    handleDeleteLineItem,
    receipt,
    isReady,
    isDeleting,
  } = useZeroLineItemMutations();

  if (!isReady || !receipt) {
    return null;
  }

  const allAssignments = receipt.lineItems.flatMap((item) => item.assignments);

  return (
    <LineItemsTableDesktop
      line_items={receipt.lineItems}
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
