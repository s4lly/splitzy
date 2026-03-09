import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { EvenSplitTabCollab } from './components/EvenSplitTabCollab';
import { ManualSplitTabCollab } from './components/ManualSplitTabCollab';

export const BillSplitSectionCollab = () => {
  return (
    <Card className="overflow-hidden border-0 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)]">
      <Tabs className="p-3" defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="evenly">Evenly</TabsTrigger>
        </TabsList>
        <TabsContent value="manual">
          <ManualSplitTabCollab />
        </TabsContent>
        <TabsContent value="evenly">
          <EvenSplitTabCollab />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
