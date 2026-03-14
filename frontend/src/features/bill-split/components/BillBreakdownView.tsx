import { Plural, Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { Check, FileText, UserPlus } from 'lucide-react';

import { getAvatarChipColors } from '@/components/Receipt/utils/avatar-chip-colors';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { getPersonItems } from '@/components/Receipt/utils/line-item-utils';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Avatar, AvatarBadge, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { PersonInfo } from '@/features/bill-split/types';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import type { Receipt } from '@/models/Receipt';

export interface BillBreakdownViewProps {
  people: PersonInfo[];
  receipt: Receipt;
  personFairTotals: Map<string, Decimal>;
  personPretaxTotals: Map<string, Decimal>;
  receiptTotal: Decimal;
  useEqualSplit: boolean;
  onManagePeopleClick?: () => void;
  /** Receipt user id linked to the signed-in user; show badge on that person's avatar when set */
  linkedToSignedInUserReceiptUserId?: string | null;
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
}: BillBreakdownViewProps) => {
  const { t } = useLingui();

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

  return (
    <div className="space-y-2">
      <h3 className="mb-1 font-medium">
        <Trans>Bill Breakdown</Trans>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => {
          const c = chipColors.get(person.id);

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
          const personAvatar = (
            <Avatar
              className={cn(
                'ring-1',
                c?.ring,
                isLinkedToSignedInUser && 'overflow-visible'
              )}
              title={person.displayName}
            >
              <AvatarFallback className={cn(c?.bg, c?.text)}>
                {getInitials(person.displayName)}
              </AvatarFallback>
              {isLinkedToSignedInUser && (
                <AvatarBadge
                  className="bg-green-600 text-white ring-2 ring-background dark:bg-green-700 dark:text-white"
                  aria-label={t`Linked to your account`}
                >
                  <Check className="size-2.5" aria-hidden />
                </AvatarBadge>
              )}
            </Avatar>
          );

          return (
            <Dialog key={person.id}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="font-inherit w-full cursor-pointer rounded-lg border bg-transparent p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {personAvatar}
                    <span className="truncate font-medium">
                      {person.displayName}
                    </span>
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
                        <Trans>1/{people.length} of the total</Trans>
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

                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
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
                </button>
              </DialogTrigger>

              <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {personAvatar}
                    <span>
                      <Trans>{person.displayName}'s Items</Trans>
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    <Trans>
                      Detailed breakdown of items assigned to{' '}
                      {person.displayName}.
                    </Trans>
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto">
                  {personItems.length > 0 ? (
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              <Trans>Item</Trans>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                              <Trans>Qty</Trans>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                              <Trans>Price</Trans>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {personItems.map((item, itemIdx) => (
                            <tr
                              key={itemIdx}
                              className={`border-t ${
                                itemIdx % 2 ? 'bg-muted/20' : ''
                              }`}
                            >
                              <td className="px-3 py-2.5 align-top">
                                <div className="max-w-[200px] overflow-x-auto text-sm">
                                  {item.name ?? t`(Unnamed item)`}
                                </div>
                                {item.shared && (
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    <Trans>
                                      Shared with{' '}
                                      {item.sharedWith
                                        .map((id) => idToName.get(id) ?? id)
                                        .join(', ')}
                                    </Trans>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right align-top text-sm">
                                {item.quantity.toNumber()}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-right align-top text-sm">
                                <div className="font-medium">
                                  {formatCurrency(item.price)}
                                </div>
                                {item.shared && (
                                  <div className="text-xs text-muted-foreground">
                                    <Trans>
                                      of {formatCurrency(item.originalPrice)}
                                    </Trans>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/50 font-medium">
                          <tr className="border-t">
                            <td colSpan={2} className="px-3 py-2 text-sm">
                              <Trans>Subtotal</Trans>
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              {formatCurrency(personPretaxTotal)}
                            </td>
                          </tr>
                          {!receipt.taxIncludedInItems &&
                            (receipt.tax?.toNumber() ?? 0) > 0 && (
                              <tr className="border-t">
                                <td colSpan={2} className="px-3 py-2 text-sm">
                                  <Trans>Tax</Trans>
                                </td>
                                <td className="px-3 py-2 text-right text-sm">
                                  {formatCurrency(taxAmount)}
                                </td>
                              </tr>
                            )}
                          {((receipt.tip?.toNumber() ?? 0) > 0 ||
                            (receipt.gratuity?.toNumber() ?? 0) > 0) && (
                            <tr className="border-t">
                              <td colSpan={2} className="px-3 py-2 text-sm">
                                <Trans>Tip</Trans>
                              </td>
                              <td className="px-3 py-2 text-right text-sm">
                                {(() => {
                                  const totalTip = (
                                    receipt.tip ?? new Decimal(0)
                                  ).plus(receipt.gratuity ?? new Decimal(0));
                                  const tipPerPerson = totalTip.div(
                                    people.length
                                  );
                                  return formatCurrency(tipPerPerson);
                                })()}
                              </td>
                            </tr>
                          )}
                          <tr className="border-t">
                            <td
                              colSpan={2}
                              className="px-3 py-2 text-base font-semibold"
                            >
                              <Trans>Total</Trans>
                            </td>
                            <td className="px-3 py-2 text-right text-base font-semibold">
                              {formatCurrency(personFairTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">
                        {useEqualSplit ? (
                          <Trans>
                            Equal split - no specific items assigned
                          </Trans>
                        ) : (
                          <Trans>No items assigned yet</Trans>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <DialogClose asChild>
                    <Button variant="outline">
                      <Trans>Close</Trans>
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </div>
  );
};
