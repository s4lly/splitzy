import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvenSplitTab } from './components/EvenSplitTab';
import { ManualSplitTab } from './components/ManualSplitTab';
import { BillSplitSectionProps } from './types';

export const BillSplitSection = ({
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
  onAddPerson,
  onRemovePerson,
}: BillSplitSectionProps) => {
  return (
    <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
      <Tabs className="p-3" defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="evenly">Evenly</TabsTrigger>
        </TabsList>
        <TabsContent value="manual">
          <ManualSplitTab
            people={people}
            receipt={receipt}
            personFairTotals={personFairTotals}
            personPretaxTotals={personPretaxTotals}
            personTotalsSum={personTotalsSum}
            receiptTotal={receiptTotal}
            unassignedAmount={unassignedAmount}
            isFullyAssigned={isFullyAssigned}
            useEqualSplit={useEqualSplit}
            receiptHasLineItems={receiptHasLineItems}
            onAddPerson={onAddPerson}
            onRemovePerson={onRemovePerson}
          />
        </TabsContent>
        <TabsContent value="evenly">
          <EvenSplitTab receipt={receipt} people={people} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
