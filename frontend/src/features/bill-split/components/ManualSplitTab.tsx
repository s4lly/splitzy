import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Receipt } from '@/models/Receipt';
import Decimal from 'decimal.js';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { AssignmentProgress } from './AssignmentProgress';
import { BillBreakdown } from './BillBreakdown';
import { EqualSplitBanner } from './EqualSplitBanner';

interface ManualSplitTabProps {
  people: string[];
  receipt: Receipt;
  personFairTotals: Map<string, Decimal>;
  personPretaxTotals: Map<string, Decimal>;
  personTotalsSum: Decimal;
  receiptTotal: Decimal;
  unassignedAmount: Decimal;
  isFullyAssigned: boolean;
  useEqualSplit: boolean;
  receiptHasLineItems: boolean;
}

export const ManualSplitTab = ({
  people,
  receipt,
  personFairTotals,
  personPretaxTotals,
  personTotalsSum,
  receiptTotal,
  unassignedAmount,
  isFullyAssigned,
  useEqualSplit,
  receiptHasLineItems,
}: ManualSplitTabProps) => {
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  // const [newPersonName, setNewPersonName] = useState('');

  // const handleAddPerson = () => {
  //   if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
  //     onAddPerson(newPersonName.trim());
  //     setNewPersonName('');
  //   }
  // };

  return (
    <>
      <CardHeader className="px-0">
        <CardTitle className="flex items-center justify-between text-xl font-bold">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            Split with Friends
          </div>
          <Button
            variant="outline"
            disabled
            size="sm"
            // onClick={() => setShowPeopleManager(!showPeopleManager)}
          >
            {showPeopleManager ? 'Hide' : 'Manage People'}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Assignment Progress */}
        {people.length > 0 && (
          <AssignmentProgress
            personTotalsSum={personTotalsSum}
            receiptTotal={receiptTotal}
            unassignedAmount={unassignedAmount}
            isFullyAssigned={isFullyAssigned}
          />
        )}

        {/* Equal Split Banner */}
        {useEqualSplit && people.length > 0 && (
          <EqualSplitBanner receiptHasLineItems={receiptHasLineItems} />
        )}

        {/* TODO revisit "people manager" and work with server state instead */}
        {/* People Manager Form */}
        {/* {showPeopleManager && (
          <PeopleManagerForm
            people={people}
            newPersonName={newPersonName}
            onNewPersonNameChange={setNewPersonName}
            onAddPerson={handleAddPerson}
            onRemovePerson={onRemovePerson}
          />
        )} */}

        {/* Bill Breakdown */}
        <BillBreakdown
          people={people}
          receipt={receipt}
          personFairTotals={personFairTotals}
          personPretaxTotals={personPretaxTotals}
          receiptTotal={receiptTotal}
          useEqualSplit={useEqualSplit}
          onManagePeopleClick={() => setShowPeopleManager(true)}
        />
      </CardContent>
    </>
  );
};
