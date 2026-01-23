import PersonBadge from '@/components/Receipt/PersonBadge';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import {
  getColorForName,
  getColorStyle,
} from '@/components/Receipt/utils/get-color-for-name';
import { getPersonItems } from '@/components/Receipt/utils/line-item-utils';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
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
import {
  assignmentsAtom,
  personFairTotalsAtom,
  personPretaxTotalsAtom,
  receiptAtom,
  receiptTotalAtom,
  useEqualSplitAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { getUserDisplayName } from '@/utils/user-display';
import Decimal from 'decimal.js';
import { useAtomValue } from 'jotai';
import { FileText, UserPlus } from 'lucide-react';

export const BillBreakdownCollab = () => {
  const isMobile = useMobile();
  const assignments = useAtomValue(assignmentsAtom);
  const userIds = assignments.map((a) => a.userId);
  const receipt = useAtomValue(receiptAtom);
  const personFairTotals = useAtomValue(personFairTotalsAtom);
  const personPretaxTotals = useAtomValue(personPretaxTotalsAtom);
  const receiptTotal = useAtomValue(receiptTotalAtom);
  const useEqualSplit = useAtomValue(useEqualSplitAtom);

  const handleManagePeopleClick = () => {
    // Blank implementation - no operation
  };

  if (!receipt) {
    return null;
  }

  if (userIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 p-6 text-center">
        <UserPlus className="mb-2 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-medium">
          Add People to Split the Bill
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Click "Manage People" to add friends and assign items to them. Then
          tag each item with who should pay for it.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={handleManagePeopleClick}
        >
          <UserPlus className="mr-1 h-4 w-4" />
          Manage People
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="mb-1 font-medium">Bill Breakdown</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment, idx) => {
          const userId = assignment.userId;
          const displayName = getUserDisplayName(assignment);
          const userIdString = String(userId);
          const colorPair = getColorForName(userIdString, idx, assignments.length);
          const colorStyle = getColorStyle(colorPair);

          const personFairTotal: Decimal =
            personFairTotals.get(userId) ?? new Decimal(0);

          const personPretaxTotal: Decimal =
            personPretaxTotals.get(userId) ?? new Decimal(0);

          const taxAmount: Decimal = personPretaxTotal.mul(
            calculations.tax.getRate(receipt)
          );

          const personItems = getPersonItems(userId, receipt);

          return (
            <Dialog key={userId}>
              <DialogTrigger asChild>
                <div
                  className="cursor-pointer rounded-lg border p-4 transition-shadow [background-color:color-mix(in_srgb,var(--bg-light)_5%,transparent)] hover:shadow-md dark:[background-color:color-mix(in_srgb,var(--bg-dark)_20%,transparent)]"
                  style={colorStyle}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <PersonBadge
                      name={displayName}
                      size={isMobile ? 'sm' : 'md'}
                      colorStyle={colorStyle}
                      className={cn(!isMobile && 'border-2 border-white')}
                    />
                    <span className="truncate font-medium">{displayName}</span>
                  </div>

                  {useEqualSplit ? (
                    <>
                      <div className="flex items-end justify-between">
                        <div className="text-lg font-semibold">
                          {formatCurrency(
                            personFairTotals.get(userId) ?? new Decimal(0)
                          )}
                        </div>
                        <div className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-800/30 dark:text-blue-300">
                          Equal split
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {`1/${userIds.length} of the total`}
                      </div>
                    </>
                  ) : !receipt.taxIncludedInItems &&
                    (receipt.tax?.toNumber() ?? 0) > 0 ? (
                    <>
                      <div className="flex items-end justify-between">
                        <div className="text-sm text-muted-foreground">
                          Items subtotal:
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(
                            personPretaxTotals.get(userId) ?? new Decimal(0)
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex items-end justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>Tax:</span>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(taxAmount)}
                        </div>
                      </div>
                      <div className="mt-1 flex items-end justify-between border-t pt-1">
                        <div className="text-base font-semibold">Total:</div>
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
                        {calculations.utils.formatPercentage(
                          personFairTotal,
                          receiptTotal
                        )}{' '}
                        of total
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    {!useEqualSplit ? (
                      <>
                        <FileText className="h-3 w-3" />
                        {`${personItems.length} item${
                          personItems.length !== 1 ? 's' : ''
                        } assigned`}
                      </>
                    ) : (
                      'Equal amount split'
                    )}
                  </div>
                </div>
              </DialogTrigger>

              <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PersonBadge
                      name={displayName}
                      size="md"
                      colorStyle={colorStyle}
                      className={cn(!isMobile && 'border-2 border-white')}
                    />
                    <span>{displayName}'s Items</span>
                  </DialogTitle>
                  <DialogDescription>
                    Detailed breakdown of items assigned to {displayName}.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto">
                  {personItems.length > 0 ? (
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              Item
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                              Qty
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                              Price
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
                                  {item.name}
                                </div>
                                {item.shared && (
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    Shared with {item.sharedWith.join(', ')}
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
                                    of {formatCurrency(item.originalPrice)}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/50 font-medium">
                          <tr className="border-t">
                            <td colSpan={2} className="px-3 py-2 text-sm">
                              Subtotal
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              {formatCurrency(
                                personPretaxTotals.get(userId) ?? new Decimal(0)
                              )}
                            </td>
                          </tr>
                          {!receipt.taxIncludedInItems &&
                            (receipt.tax?.toNumber() ?? 0) > 0 && (
                              <tr className="border-t">
                                <td colSpan={2} className="px-3 py-2 text-sm">
                                  Tax
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
                                Tip
                              </td>
                              <td className="px-3 py-2 text-right text-sm">
                                {(() => {
                                  const totalTip = (
                                    receipt.tip ?? new Decimal(0)
                                  ).plus(receipt.gratuity ?? new Decimal(0));
                                  const tipPerPerson = totalTip.div(
                                    userIds.length
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
                              Total
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
                        {useEqualSplit
                          ? 'Equal split - no specific items assigned'
                          : 'No items assigned yet'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
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
