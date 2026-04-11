import { useAuth } from '@clerk/clerk-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useZero } from '@rocicorp/zero/react';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { BillBreakdownView } from '@/features/bill-split/components/BillBreakdownView';
import {
  assignedUsersAtom,
  personFairTotalsAtom,
  personPaidStatusAtom,
  personPretaxTotalsAtom,
  receiptAtom,
  receiptTotalAtom,
  useEqualSplitAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { getUserDisplayName } from '@/utils/user-display';
import { mutators } from '@/zero/mutators';

export const BillBreakdownCollab = () => {
  const { t } = useLingui();
  const { userId: clerkUserId } = useAuth();
  const zero = useZero();
  const navigate = useNavigate();
  const assignedUsers = useAtomValue(assignedUsersAtom);
  const receipt = useAtomValue(receiptAtom);
  const personFairTotals = useAtomValue(personFairTotalsAtom);
  const personPretaxTotals = useAtomValue(personPretaxTotalsAtom);
  const receiptTotal = useAtomValue(receiptTotalAtom);
  const useEqualSplit = useAtomValue(useEqualSplitAtom);
  const personPaidStatus = useAtomValue(personPaidStatusAtom);

  if (!receipt) {
    return null;
  }

  const people = assignedUsers.map((a) => ({
    id: a.receiptUserId,
    displayName: getUserDisplayName(a),
  }));

  let linkedToSignedInUserReceiptUserId: string | null = null;
  if (clerkUserId != null) {
    const claimedBySignedInUser = assignedUsers.find(
      (a) => a.receiptUser?.user?.authUserId === clerkUserId
    );
    linkedToSignedInUserReceiptUserId =
      claimedBySignedInUser?.receiptUserId ?? null;
  }

  const handleTogglePaid = async (
    receiptUserId: string,
    currentlyPaid: boolean
  ) => {
    try {
      const result = zero.mutate(
        mutators.receiptUsers.updatePaidStatus({
          id: receiptUserId,
          paid_at: currentlyPaid ? null : Date.now(),
        })
      );
      const clientResult = await result.client;
      if (clientResult.type === 'error') {
        toast.error(t`Failed to update payment status`);
      }
    } catch {
      toast.error(t`Failed to update payment status`);
    }
  };

  const handleSoftDelete = async () => {
    try {
      const result = zero.mutate(
        mutators.receipts.softDelete({ id: receipt.id })
      );
      const clientResult = await result.client;
      if (clientResult.type === 'error') {
        toast.error(t`Failed to delete receipt`);
        return;
      }
      navigate('/', { replace: true });
    } catch {
      toast.error(t`Failed to delete receipt`);
    }
  };

  return (
    <BillBreakdownView
      people={people}
      receipt={receipt}
      personFairTotals={personFairTotals}
      personPretaxTotals={personPretaxTotals}
      receiptTotal={receiptTotal}
      useEqualSplit={useEqualSplit}
      linkedToSignedInUserReceiptUserId={linkedToSignedInUserReceiptUserId}
      personPaidStatus={personPaidStatus}
      onTogglePaid={handleTogglePaid}
      onSoftDelete={handleSoftDelete}
    />
  );
};
