import { Trans } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { UserPlus } from 'lucide-react';

import { getAvatarChipColors } from '@/components/Receipt/utils/avatar-chip-colors';
import { getPersonItems } from '@/components/Receipt/utils/line-item-utils';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import type { PersonInfo } from '@/features/bill-split/types';
import type { Receipt } from '@/models/Receipt';

import { PersonCard } from './PersonCard';
import { SettlementControls } from './SettlementControls';

export interface BillBreakdownViewProps {
  people: PersonInfo[];
  receipt: Receipt;
  personFairTotals: Map<string, Decimal>;
  personPretaxTotals: Map<string, Decimal>;
  receiptTotal: Decimal;
  useEqualSplit: boolean;
  onManagePeopleClick?: () => void;
  linkedToSignedInUserReceiptUserId?: string | null;
  personPaidStatus: Map<string, boolean>;
  onTogglePaid: (receiptUserId: string, currentlyPaid: boolean) => void;
  onSoftDelete: () => void;
}

export const BillBreakdownView = ({
  people,
  receipt,
  personFairTotals,
  personPretaxTotals,
  receiptTotal,
  useEqualSplit,
  onManagePeopleClick,
  linkedToSignedInUserReceiptUserId,
  personPaidStatus,
  onTogglePaid,
  onSoftDelete,
}: BillBreakdownViewProps) => {
  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 p-6 text-center">
        <UserPlus className="mb-2 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-medium">
          <Trans>Add People to Split the Bill</Trans>
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          <Trans>
            Click "Manage People" to add friends and assign items to them. Then
            tag each item with who should pay for it.
          </Trans>
        </p>
        {onManagePeopleClick != null && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onManagePeopleClick}
          >
            <UserPlus className="mr-1 h-4 w-4" />
            <Trans>Manage People</Trans>
          </Button>
        )}
      </div>
    );
  }

  const personIds = people.map((p) => p.id);
  const chipColors = getAvatarChipColors(receipt.id, personIds);
  const idToName = new Map(people.map((p) => [p.id, p.displayName]));

  const allPaid =
    people.length > 0 && people.every((p) => personPaidStatus.get(p.id));

  return (
    <div className="space-y-2">
      <h3 className="mb-1 font-medium">
        <Trans>Bill Breakdown</Trans>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => {
          const c = chipColors.get(person.id);
          const isPaid = personPaidStatus.get(person.id) ?? false;

          const personFairTotal: Decimal =
            personFairTotals.get(person.id) ?? new Decimal(0);

          const personPretaxTotal: Decimal =
            personPretaxTotals.get(person.id) ?? new Decimal(0);

          const taxAmount: Decimal = personPretaxTotal.mul(
            calculations.tax.getRate(receipt)
          );

          const personItems = getPersonItems(person.id, receipt);

          const isLinkedToSignedInUser =
            linkedToSignedInUserReceiptUserId != null &&
            person.id === linkedToSignedInUserReceiptUserId;

          return (
            <PersonCard
              key={person.id}
              person={person}
              receipt={receipt}
              isPaid={isPaid}
              personFairTotal={personFairTotal}
              personPretaxTotal={personPretaxTotal}
              taxAmount={taxAmount}
              personItems={personItems}
              useEqualSplit={useEqualSplit}
              receiptTotal={receiptTotal}
              peopleCount={people.length}
              chipColors={c}
              isLinkedToSignedInUser={isLinkedToSignedInUser}
              idToName={idToName}
              onTogglePaid={onTogglePaid}
            />
          );
        })}
      </div>

      {/* Settlement controls */}
      <SettlementControls allPaid={allPaid} onSoftDelete={onSoftDelete} />
    </div>
  );
};
