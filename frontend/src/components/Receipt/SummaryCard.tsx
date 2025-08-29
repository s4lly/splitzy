import { DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ReceiptDataSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { formatCurrency } from "./utils/format-currency";
import {
  getTotalForAllItems,
  getTaxAmount,
  getTotal,
} from "./utils/receipt-calculation";
import GratuityEditor from "./GratuityEditor";
import TipEditor from "./TipEditor";

interface SummaryCardProps {
  receiptId: string;
  receipt_data: z.infer<typeof ReceiptDataSchema>;
  editLineItemsEnabled: boolean;
}

const SummaryCard = ({
  receiptId,
  receipt_data,
  editLineItemsEnabled,
}: SummaryCardProps) => {
  console.log("receipt_data.gratuity", receipt_data.gratuity);

  const itemsTotal = editLineItemsEnabled
    ? getTotalForAllItems(receipt_data)
    : receipt_data.items_total || 0;

  return (
    <Card className="shadow-md border-2 overflow-hidden rounded-none sm:rounded-lg">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <DollarSign className="h-6 w-6" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-4">
          {/* Tax Information Alert */}
          {receipt_data.tax_included_in_items && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-2 sm:p-3 rounded-md mb-3 text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
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
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-2 sm:p-3 rounded-md mb-3 text-sm flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
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
          <div className="flex justify-between items-center py-2">
            <span className="text-base">Items Total:</span>
            <span className="text-base font-medium">
              {editLineItemsEnabled
                ? formatCurrency(getTotalForAllItems(receipt_data))
                : formatCurrency(receipt_data.items_total || 0)}
            </span>
          </div>

          {/* Displayed Subtotal if different from items total */}
          {Math.abs(
            (receipt_data.display_subtotal || 0) -
              (receipt_data.items_total || 0)
          ) > 0.01 && (
            <div className="flex justify-between items-center py-1 sm:py-2">
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
            <div className="flex justify-between items-center py-1 sm:py-2">
              <span className="text-base">Pre-tax Total:</span>
              <span className="text-base font-medium">
                {formatCurrency(receipt_data.pretax_total || 0)}
              </span>
            </div>
          )}

          {/* Tax Amount */}
          <div className="flex justify-between  items-center py-1 sm:py-2">
            <div className="flex items-center">
              <span className="text-base">Tax:</span>
              {receipt_data.tax_included_in_items && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                  Included in prices
                </span>
              )}
            </div>
            <span className="text-base font-medium">
              {editLineItemsEnabled
                ? formatCurrency(
                    getTaxAmount(
                      getTotalForAllItems(receipt_data),
                      receipt_data
                    ) || 0
                  )
                : formatCurrency(receipt_data.tax || 0)}
            </span>
          </div>

          {/* Post-tax total if different from final total */}
          {((receipt_data.tip ?? 0) > 0 ||
            (receipt_data.gratuity ?? 0) > 0) && (
            <div className="flex justify-between items-center py-1 sm:py-2">
              <span className="text-base">Post-tax Total:</span>
              <span className="text-base font-medium">
                {formatCurrency(
                  getTotalForAllItems(receipt_data) +
                    getTaxAmount(
                      getTotalForAllItems(receipt_data),
                      receipt_data
                    ) || 0
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
          <div className="flex justify-between items-center pt-3 border-t-2 border-border mt-2">
            <span className="font-semibold text-base">Final Total:</span>
            <span className="font-bold text-xl">
              {editLineItemsEnabled
                ? formatCurrency(getTotal(receipt_data))
                : formatCurrency(
                    receipt_data.final_total || receipt_data.total || 0
                  )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
