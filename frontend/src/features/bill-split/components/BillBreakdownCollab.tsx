import { useAuth } from '@clerk/clerk-react';
import { useAtomValue } from 'jotai';

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

export const BillBreakdownCollab = () => {
  const { userId: clerkUserId } = useAuth();
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

  // Resolve which receipt user (if any) is linked to the signed-in Clerk user for the avatar badge.
  let linkedToSignedInUserReceiptUserId: string | null = null;
  if (clerkUserId != null) {
    const claimedBySignedInUser = assignedUsers.find(
      (a) => a.receiptUser?.user?.authUserId === clerkUserId
    );
    linkedToSignedInUserReceiptUserId =
      claimedBySignedInUser?.receiptUserId ?? null;
  }

  return (
    <BillBreakdownView
      people={people}
      receipt={receipt}
      personFairTotals={personFairTotals}
      personPretaxTotals={personPretaxTotals}
      receiptTotal={receiptTotal}
      useEqualSplit={useEqualSplit}
      linkedToSignedInUserReceiptUserId={linkedToSignedInUserReceiptUserId}
    />
  );
};
