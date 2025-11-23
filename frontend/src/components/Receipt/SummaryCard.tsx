import GratuityEditor from '@/features/summary-card/GratuityEditor';
import TipEditor from '@/features/summary-card/TipEditor';
import { ReceiptDataSchema } from '@/lib/receiptSchemas';
import { AlertCircle, DollarSign } from 'lucide-react';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from './utils/format-currency';
import { calculations } from './utils/receipt-calculation';

interface SummaryCardProps {
  receiptId: string;
  receipt_data: z.infer<typeof ReceiptDataSchema>;
}

const SummaryCard = ({ receiptId, receipt_data }: SummaryCardProps) => {
  const itemsTotal = calculations.pretax.getTotalForAllItems(receipt_data);

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
          {receipt_data.tax_included_in_items && (
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

          {!receipt_data.tax_included_in_items &&
            (receipt_data.tax ?? 0) > 0 && (
              <div className="mb-3 flex items-start rounded-md bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 sm:p-3">
                <AlertCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Tax Calculation</p>
                  <p>
                    {(() => {
                      const pretaxTotal =
                        receipt_data.pretax_total ||
                        receipt_data.items_total ||
                        0;
                      const taxRate =
                        pretaxTotal > 0
                          ? ((receipt_data.tax ?? 0) / pretaxTotal) * 100
                          : 0;
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
          {Math.abs(
            (receipt_data.display_subtotal || 0) -
              (receipt_data.items_total || 0)
          ) > 0.01 && (
            <div className="flex items-center justify-between py-1 sm:py-2">
              <span className="text-base">Subtotal (as shown):</span>
              <span className="text-base font-medium">
                {formatCurrency(receipt_data.display_subtotal || 0)}
              </span>
            </div>
          )}

          {/* Show pretax total if different from subtotal */}
          {Math.abs(
            (receipt_data.pretax_total || 0) -
              (receipt_data.display_subtotal || 0)
          ) > 0.01 && (
            <div className="flex items-center justify-between py-1 sm:py-2">
              <span className="text-base">Pre-tax Total:</span>
              <span className="text-base font-medium">
                {formatCurrency(receipt_data.pretax_total || 0)}
              </span>
            </div>
          )}

          {/* Tax Amount */}
          <div className="flex items-center justify-between py-1 sm:py-2">
            <div className="flex items-center">
              <span className="text-base">Tax:</span>
              {receipt_data.tax_included_in_items && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  Included in prices
                </span>
              )}
            </div>
            <span className="text-base font-medium">
              {formatCurrency(
                itemsTotal * calculations.tax.getRate(receipt_data) || 0
              )}
            </span>
          </div>

          {/* Post-tax total if different from final total */}
          {((receipt_data.tip ?? 0) > 0 ||
            (receipt_data.gratuity ?? 0) > 0) && (
            <div className="flex items-center justify-between py-1 sm:py-2">
              <span className="text-base">Post-tax Total:</span>
              <span className="text-base font-medium">
                {formatCurrency(
                  itemsTotal +
                    itemsTotal * calculations.tax.getRate(receipt_data) || 0
                )}
              </span>
            </div>
          )}

          {/* Tip */}
          <TipEditor
            receiptId={receiptId}
            receiptTip={receipt_data.tip ?? 0}
            itemsTotal={itemsTotal}
          />

          {/* Gratuity */}
          <GratuityEditor
            receiptId={receiptId}
            receiptGratuity={receipt_data.gratuity ?? 0}
          />

          {/* Final Total */}
          <div className="mt-2 flex items-center justify-between border-t-2 border-border pt-3">
            <span className="text-base font-semibold">Final Total:</span>
            <span className="text-xl font-bold">
              {formatCurrency(calculations.final.getReceiptTotal(receipt_data))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
