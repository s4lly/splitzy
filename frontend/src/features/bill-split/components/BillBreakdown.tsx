import Decimal from 'decimal.js';

import { BillBreakdownView } from '@/features/bill-split/components/BillBreakdownView';
import type { Receipt } from '@/models/Receipt';

interface BillBreakdownProps {
  people: string[];
  receipt: Receipt;
  personFairTotals: Map<string, Decimal>;
  personPretaxTotals: Map<string, Decimal>;
  receiptTotal: Decimal;
  useEqualSplit: boolean;
  onManagePeopleClick: () => void;
}

export const BillBreakdown = ({
  people,
  receipt,
  personFairTotals,
  personPretaxTotals,
  receiptTotal,
  useEqualSplit,
  onManagePeopleClick,
}: BillBreakdownProps) => {
  const personInfos = people.map((name) => ({ id: name, displayName: name }));
  return (
    <BillBreakdownView
      people={personInfos}
      receipt={receipt}
      personFairTotals={personFairTotals}
      personPretaxTotals={personPretaxTotals}
      receiptTotal={receiptTotal}
      useEqualSplit={useEqualSplit}
      onManagePeopleClick={onManagePeopleClick}
    />
  );
};
