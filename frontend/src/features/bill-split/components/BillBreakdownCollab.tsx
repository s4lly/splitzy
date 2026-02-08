import { BillBreakdownView } from '@/features/bill-split/components/BillBreakdownView';
import {
  assignedUsersAtom,
  personFairTotalsAtom,
  personPretaxTotalsAtom,
  receiptAtom,
  receiptTotalAtom,
  useEqualSplitAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { getUserDisplayName } from '@/utils/user-display';
import { useAtomValue } from 'jotai';

export const BillBreakdownCollab = () => {
  const assignedUsers = useAtomValue(assignedUsersAtom);
  const receipt = useAtomValue(receiptAtom);
  const personFairTotals = useAtomValue(personFairTotalsAtom);
  const personPretaxTotals = useAtomValue(personPretaxTotalsAtom);
  const receiptTotal = useAtomValue(receiptTotalAtom);
  const useEqualSplit = useAtomValue(useEqualSplitAtom);

  if (!receipt) {
    return null;
  }

  const people = assignedUsers.map((a) => ({
    id: a.receiptUserId,
    displayName: getUserDisplayName(a),
  }));

  return (
    <BillBreakdownView
      people={people}
      receipt={receipt}
      personFairTotals={personFairTotals}
      personPretaxTotals={personPretaxTotals}
      receiptTotal={receiptTotal}
      useEqualSplit={useEqualSplit}
    />
  );
};
