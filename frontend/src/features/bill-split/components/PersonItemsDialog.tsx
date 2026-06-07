import { Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';

import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import type { PersonItem } from '@/components/Receipt/utils/line-item-utils';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Receipt } from '@/models/Receipt';

import { PersonAvatar } from './PersonAvatar';

export interface PersonItemsDialogProps {
  displayName: string;
  chipColors?: { ring?: string; bg?: string; text?: string };
  isLinkedToSignedInUser: boolean;
  personItems: PersonItem[];
  personPretaxTotal: Decimal;
  personFairTotal: Decimal;
  taxAmount: Decimal;
  receipt: Receipt;
  peopleCount: number;
  useEqualSplit: boolean;
  idToName: Map<string, string>;
}

export const PersonItemsDialog = ({
  displayName,
  chipColors,
  isLinkedToSignedInUser,
  personItems,
  personPretaxTotal,
  personFairTotal,
  taxAmount,
  receipt,
  peopleCount,
  useEqualSplit,
  idToName,
}: PersonItemsDialogProps) => {
  const { t } = useLingui();

  return (
    <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PersonAvatar
            displayName={displayName}
            chipColors={chipColors}
            isLinkedToSignedInUser={isLinkedToSignedInUser}
          />
          <span>
            <Trans>{displayName}'s Items</Trans>
          </span>
        </DialogTitle>
        <DialogDescription>
          <Trans>Detailed breakdown of items assigned to {displayName}.</Trans>
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
                    className={`border-t ${itemIdx % 2 ? 'bg-muted/20' : ''}`}
                  >
                    <td className="px-3 py-2.5 align-top">
                      <div className="max-w-[200px] overflow-x-auto text-sm">
                        {item.name ?? t`(Unnamed item)`}
                      </div>
                      {item.shared && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {(() => {
                            const sharedWithNames = item.sharedWith
                              .map((id) => idToName.get(id) ?? id)
                              .join(', ');
                            return <Trans>Shared with {sharedWithNames}</Trans>;
                          })()}
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
                          <Trans>of {formatCurrency(item.originalPrice)}</Trans>
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
                        const totalTip = (receipt.tip ?? new Decimal(0)).plus(
                          receipt.gratuity ?? new Decimal(0)
                        );
                        const tipPerPerson = totalTip.div(peopleCount);
                        return formatCurrency(tipPerPerson);
                      })()}
                    </td>
                  </tr>
                )}
                <tr className="border-t">
                  <td colSpan={2} className="px-3 py-2 text-base font-semibold">
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
                <Trans>Equal split - no specific items assigned</Trans>
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
  );
};
