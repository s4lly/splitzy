import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvenSplitTabCollab } from './components/EvenSplitTabCollab';
import { ManualSplitTabCollab } from './components/ManualSplitTabCollab';

export const BillSplitSectionCollab = () => {
  return (
    <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
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

