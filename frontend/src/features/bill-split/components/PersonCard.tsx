import { Plural, Trans } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { ArrowRight, Check, Circle, FileText } from 'lucide-react';

import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import type { PersonItem } from '@/components/Receipt/utils/line-item-utils';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import type { PersonInfo } from '@/features/bill-split/types';
import { cn } from '@/lib/utils';
import type { Receipt } from '@/models/Receipt';

import { PersonAvatar } from './PersonAvatar';
import { PersonItemsDialog } from './PersonItemsDialog';

export interface PersonCardProps {
  person: PersonInfo;
  receipt: Receipt;
  isPaid: boolean;
  personFairTotal: Decimal;
  personPretaxTotal: Decimal;
  taxAmount: Decimal;
  personItems: PersonItem[];
  useEqualSplit: boolean;
  receiptTotal: Decimal;
  peopleCount: number;
  chipColors: { ring?: string; bg?: string; text?: string } | undefined;
  isLinkedToSignedInUser: boolean;
  idToName: Map<string, string>;
  onTogglePaid: (receiptUserId: string, currentlyPaid: boolean) => void;
}

export const PersonCard = ({
  person,
  receipt,
  isPaid,
  personFairTotal,
  personPretaxTotal,
  taxAmount,
  personItems,
  useEqualSplit,
  receiptTotal,
  peopleCount,
  chipColors: c,
  isLinkedToSignedInUser,
  idToName,
  onTogglePaid,
}: PersonCardProps) => {
  return (
    <Dialog>
      <div
        className={cn(
          'overflow-hidden rounded-lg border bg-card transition-shadow',
          !isPaid && 'hover:shadow-md'
        )}
      >
        <div className={cn('p-4', isPaid && 'opacity-45')}>
          <div className="mb-2 flex items-center gap-2">
            <PersonAvatar
              displayName={person.displayName}
              chipColors={c}
              isLinkedToSignedInUser={isLinkedToSignedInUser}
            />
            <span className="truncate font-medium">{person.displayName}</span>
          </div>

          {useEqualSplit ? (
            <>
              <div className="flex items-end justify-between">
                <div className="text-lg font-semibold">
                  {formatCurrency(personFairTotal)}
                </div>
                <div className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-800/30 dark:text-blue-300">
                  <Trans>Equal split</Trans>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                <Trans>1/{peopleCount} of the total</Trans>
              </div>
            </>
          ) : !receipt.taxIncludedInItems &&
            (receipt.tax?.toNumber() ?? 0) > 0 ? (
            <>
              <div className="flex items-end justify-between">
                <div className="text-sm text-muted-foreground">
                  <Trans>Items subtotal:</Trans>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(personPretaxTotal)}
                </div>
              </div>
              <div className="mt-1 flex items-end justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>
                    <Trans>Tax:</Trans>
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(taxAmount)}
                </div>
              </div>
              <div className="mt-1 flex items-end justify-between border-t pt-1">
                <div className="text-base font-semibold">
                  <Trans>Total:</Trans>
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(personFairTotal)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-end justify-between">
              <div className="text-lg font-semibold">
                {formatCurrency(personFairTotal)}
              </div>
              <div className="text-xs text-muted-foreground">
                <Trans>
                  {calculations.utils.formatPercentage(
                    personFairTotal,
                    receiptTotal
                  )}{' '}
                  of total
                </Trans>
              </div>
            </div>
          )}

          {/* Footer row: item count + view items link */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {!useEqualSplit ? (
                <>
                  <FileText className="h-3 w-3" />
                  <Trans>
                    {personItems.length}{' '}
                    <Plural
                      value={personItems.length}
                      one="item"
                      other="items"
                    />{' '}
                    assigned
                  </Trans>
                </>
              ) : (
                <Trans>Equal amount split</Trans>
              )}
            </div>

            <DialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Trans>View items</Trans>
                <ArrowRight className="h-3 w-3" />
              </button>
            </DialogTrigger>
          </div>
        </div>

        {/* Paid toggle strip */}
        <button
          type="button"
          onClick={() => onTogglePaid(person.id, isPaid)}
          className={cn(
            'flex w-full items-center gap-2 border-t px-4 py-2.5 text-xs font-medium transition-colors',
            isPaid
              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              : 'text-muted-foreground hover:bg-muted/50'
          )}
        >
          {isPaid ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 dark:bg-green-500">
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
          ) : (
            <Circle className="h-4 w-4" />
          )}
          {isPaid ? <Trans>Paid</Trans> : <Trans>Mark as paid</Trans>}
        </button>
      </div>

      <PersonItemsDialog
        displayName={person.displayName}
        chipColors={c}
        isLinkedToSignedInUser={isLinkedToSignedInUser}
        personItems={personItems}
        personPretaxTotal={personPretaxTotal}
        personFairTotal={personFairTotal}
        taxAmount={taxAmount}
        receipt={receipt}
        peopleCount={peopleCount}
        useEqualSplit={useEqualSplit}
        idToName={idToName}
      />
    </Dialog>
  );
};
