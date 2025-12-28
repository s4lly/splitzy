import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  peopleAtom,
  useEqualSplitAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useAtomValue } from 'jotai';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { AssignmentProgressCollab } from './AssignmentProgressCollab';
import { BillBreakdownCollab } from './BillBreakdownCollab';
import { EqualSplitBannerCollab } from './EqualSplitBannerCollab';

export const ManualSplitTabCollab = () => {
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const people = useAtomValue(peopleAtom);
  const useEqualSplit = useAtomValue(useEqualSplitAtom);

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
        {people.length > 0 && <AssignmentProgressCollab />}

        {/* Equal Split Banner */}
        {useEqualSplit && people.length > 0 && <EqualSplitBannerCollab />}

        {/* TODO revisit "people manager" and work with server state instead */}
        {/* People Manager Form */}
        {/* {showPeopleManager && <PeopleManagerFormCollab />} */}

        {/* Bill Breakdown */}
        <BillBreakdownCollab />
      </CardContent>
    </>
  );
};
