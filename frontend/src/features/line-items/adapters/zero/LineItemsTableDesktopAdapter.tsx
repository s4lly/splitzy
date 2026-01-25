import LineItemsTableDesktop from '@/components/Receipt/LineItemsTableDesktop';
import { assignmentsAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import { useZeroLineItemMutations } from './useZeroLineItemMutations';
import { useAtomValue } from 'jotai';

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

  const assignments = useAtomValue(assignmentsAtom);

  if (!isReady || !receipt) {
    return null;
  }

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
      allAssignments={assignments}
    />
  );
}
