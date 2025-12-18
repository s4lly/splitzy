import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { AssignmentProgress } from './components/AssignmentProgress';
import { EqualSplitBanner } from './components/EqualSplitBanner';
import { PeopleManagerForm } from './components/PeopleManagerForm';
import { BillBreakdown } from './components/BillBreakdown';
import { BillSplitSectionProps } from './types';

export const BillSplitSection = ({
  people,
  receiptData,
  receiptResult,
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
}: BillSplitSectionProps) => {
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  const handleAddPerson = () => {
    if (newPersonName.trim() && !people.includes(newPersonName.trim())) {
      onAddPerson(newPersonName.trim());
      setNewPersonName('');
    }
  };

  return (
    <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
      <CardHeader className="px-3 pb-2 sm:px-6">
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

      <CardContent className="px-3 sm:px-6">
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
    </Card>
  );
};

