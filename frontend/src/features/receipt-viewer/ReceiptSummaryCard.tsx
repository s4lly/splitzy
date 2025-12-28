import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  itemsTotalAtom,
  receiptAtom,
  receiptTotalAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import GratuityEditor from '@/features/receipt-viewer/components/GratuityEditor';
import TipEditor from '@/features/receipt-viewer/components/TipEditor';
import Decimal from 'decimal.js';
import { useAtomValue } from 'jotai';
import { AlertCircle, DollarSign } from 'lucide-react';

/**
 * Summary card component that displays receipt totals and breakdown.
 * Uses Jotai atoms for derived values - must be within a JotaiProvider.
 * Includes TipEditor and GratuityEditor components with mutation support.
 */
export const ReceiptSummaryCard = () => {
  const receipt = useAtomValue(receiptAtom);
  const itemsTotal = useAtomValue(itemsTotalAtom);
  const receiptTotal = useAtomValue(receiptTotalAtom);

  if (!receipt) {
    return null;
  }

  return (
    <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
      <CardHeader className="px-3 pb-2 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <DollarSign className="h-6 w-6" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-4">
          {/* Tax Information Alert */}
          {receipt.taxIncludedInItems && (
            <div className="mb-3 flex items-start rounded-md bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 sm:p-3">
              <AlertCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Tax Included in Prices</p>
                <p>
                  The tax is already included in the individual item prices
                  shown.
                </p>
              </div>
            </div>
          )}

          {!receipt.taxIncludedInItems &&
            receipt.tax &&
            receipt.tax.greaterThan(0) && (
              <div className="mb-3 flex items-start rounded-md bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 sm:p-3">
                <AlertCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Tax Calculation</p>
                  <p>
                    {(() => {
                      const pretaxTotal =
                        receipt.pretaxTotal ??
                        receipt.itemsTotal ??
                        new Decimal(0);
                      const taxRate = pretaxTotal.greaterThan(0)
                        ? receipt.tax.div(pretaxTotal).mul(100)
                        : new Decimal(0);
                      return `Tax rate is approximately ${taxRate.toFixed(
                        2
                      )}% and has been distributed proportionally based on each person's items.`;
                    })()}
                  </p>
                </div>
              </div>
            )}

          {/* Items Total */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base">Items Total:</span>
            <span className="text-base font-medium">
              {formatCurrency(itemsTotal)}
            </span>
          </div>

          {/* Displayed Subtotal if different from items total */}
          {receipt.displaySubtotal &&
            receipt.itemsTotal &&
            receipt.displaySubtotal
              .minus(receipt.itemsTotal)
              .abs()
              .greaterThan(new Decimal(0.01)) && (
              <div className="flex items-center justify-between py-1 sm:py-2">
                <span className="text-base">Subtotal (as shown):</span>
                <span className="text-base font-medium">
                  {formatCurrency(receipt.displaySubtotal)}
                </span>
              </div>
            )}

          {/* Show pretax total if different from subtotal */}
          {receipt.pretaxTotal &&
            receipt.displaySubtotal &&
            receipt.pretaxTotal
              .minus(receipt.displaySubtotal)
              .abs()
              .greaterThan(new Decimal(0.01)) && (
              <div className="flex items-center justify-between py-1 sm:py-2">
                <span className="text-base">Pre-tax Total:</span>
                <span className="text-base font-medium">
                  {formatCurrency(receipt.pretaxTotal)}
                </span>
              </div>
            )}

          {/* Tax Amount */}
          <div className="flex items-center justify-between py-1 sm:py-2">
            <div className="flex items-center">
              <span className="text-base">Tax:</span>
              {receipt.taxIncludedInItems && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  Included in prices
                </span>
              )}
            </div>
            <span className="text-base font-medium">
              {formatCurrency(
                itemsTotal.mul(calculations.tax.getRate(receipt))
              )}
            </span>
          </div>

          {/* Post-tax total if different from final total */}
          {((receipt.tip && receipt.tip.greaterThan(0)) ||
            (receipt.gratuity && receipt.gratuity.greaterThan(0))) && (
            <div className="flex items-center justify-between py-1 sm:py-2">
              <span className="text-base">Post-tax Total:</span>
              <span className="text-base font-medium">
                {formatCurrency(
                  receipt.posttaxTotal ??
                    itemsTotal.plus(
                      itemsTotal.mul(calculations.tax.getRate(receipt))
                    )
                )}
              </span>
            </div>
          )}

          {/* Tip */}
          <TipEditor
            receiptTip={receipt.tip ?? new Decimal(0)}
            itemsTotal={itemsTotal}
            receiptId={receipt.id}
          />

          {/* Gratuity */}
          <GratuityEditor
            receiptGratuity={receipt.gratuity ?? new Decimal(0)}
            receiptId={receipt.id}
          />

          {/* Final Total */}
          <div className="mt-2 flex items-center justify-between border-t-2 border-border pt-3">
            <span className="text-base font-semibold">Final Total:</span>
            <span className="text-xl font-bold">
              {formatCurrency(receiptTotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
