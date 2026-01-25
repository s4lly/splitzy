import LineItemsTableMobile from '@/components/Receipt/LineItemsTableMobile';
import { assignmentsAtom } from '@/features/receipt-collab/atoms/receiptAtoms';
import { useZeroLineItemMutations } from './useZeroLineItemMutations';
import { useAtomValue } from 'jotai';

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

  const assignments = useAtomValue(assignmentsAtom);

  if (!isReady || !receipt) {
    return null;
  }

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
      allAssignments={assignments}
    />
  );
}
