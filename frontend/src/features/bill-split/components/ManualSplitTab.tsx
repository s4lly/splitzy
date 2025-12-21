import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptSchema } from '@/lib/receiptSchemas';
import Decimal from 'decimal.js';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { AssignmentProgress } from './AssignmentProgress';
import { BillBreakdown } from './BillBreakdown';
import { EqualSplitBanner } from './EqualSplitBanner';
import { PeopleManagerForm } from './PeopleManagerForm';

interface ManualSplitTabProps {
  people: string[];
  receiptResult: z.infer<typeof ReceiptSchema>;
  receiptData: z.infer<typeof ReceiptSchema>['receipt_data'];
  personFairTotals: Map<string, Decimal>;
  personPretaxTotals: Map<string, Decimal>;
  personTotalsSum: Decimal;
  receiptTotal: Decimal;
  unassignedAmount: Decimal;
  isFullyAssigned: boolean;
  useEqualSplit: boolean;
  receiptHasLineItems: boolean;
  onAddPerson: (name: string) => void;
  onRemovePerson: (name: string) => void;
}

export const ManualSplitTab = ({
  people,
  receiptResult,
  receiptData,
  personFairTotals,
  personPretaxTotals,
  personTotalsSum,
  receiptTotal,
  unassignedAmount,
  isFullyAssigned,
  useEqualSplit,
  receiptHasLineItems,
  onAddPerson,
  onRemovePerson,
}: ManualSplitTabProps) => {
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  const handleAddPerson = () => {
    if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
      onAddPerson(newPersonName.trim());
      setNewPersonName('');
    }
  };

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
            size="sm"
            onClick={() => setShowPeopleManager(!showPeopleManager)}
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

        {/* People Manager Form */}
        {showPeopleManager && (
          <PeopleManagerForm
            people={people}
            newPersonName={newPersonName}
            onNewPersonNameChange={setNewPersonName}
            onAddPerson={handleAddPerson}
            onRemovePerson={onRemovePerson}
          />
        )}

        {/* Bill Breakdown */}
        <BillBreakdown
          people={people}
          receiptResult={receiptResult}
          receiptData={receiptData}
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
