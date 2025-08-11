import { DollarSign, AlertCircle, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ReceiptDataSchema } from "@/lib/receiptSchemas";
import { z } from "zod";
import { formatCurrency, truncateToTwoDecimals } from "./utils/format-currency";
import {
  getTotalForAllItems,
  getTaxAmount,
  getTotal,
} from "./utils/receipt-calculation";
import { Input } from "../ui/input";
import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useReceiptDataUpdateMutation } from "./hooks/useReceiptDataUpdateMutation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PercentageTipButton from "./components/PercentageTipButton";

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
  const [tip, setTip] = useState(receipt_data.tip ?? 0);
  const [gratuity, setGratuity] = useState(receipt_data.gratuity ?? 0);
  const [isEditingTip, setIsEditingTip] = useState(false);
  const [isEditingGratuity, setIsEditingGratuity] = useState(false);

  const itemsTotal = editLineItemsEnabled
    ? getTotalForAllItems(receipt_data)
    : receipt_data.items_total || 0;

  const { mutate } = useReceiptDataUpdateMutation();

  const handleEditTip = () => {
    setIsEditingTip(true);
  };

  const handleSaveTip = () => {
    setIsEditingTip(false);
    // Only mutate if the tip value has actually changed
    console.log("tip", tip);
    console.log("receipt_data.tip", receipt_data.tip);
    console.log(
      "tip !== (receipt_data.tip ?? 0)",
      tip !== (receipt_data.tip ?? 0)
    );
    if (tip !== (receipt_data.tip ?? 0)) {
      mutate({
        receiptId,
        tip: tip,
      });
    }
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTip(Number(e.target.value));
  };

  const handleEditGratuity = () => {
    setIsEditingGratuity(true);
  };

  const handleSaveGratuity = () => {
    setIsEditingGratuity(false);
    // Only mutate if the gratuity value has actually changed
    if (gratuity !== (receipt_data.gratuity ?? 0)) {
      mutate({
        receiptId,
        gratuity: gratuity,
      });
    }
  };

  const handleGratuityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGratuity(Number(e.target.value));
  };

  const handlePercentageTipSelect = (amount: number) => {
    setTip(amount);
    mutate({
      receiptId,
      tip: amount,
    });
    setIsEditingTip(false);
  };

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

          {/* Tip and Gratuity */}
          {(receipt_data.tip ?? 0) > 0 && (
            <div className="border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2">
              {isEditingTip ? (
                <form
                  className="flex flex-col gap-3 py-1 bg-background"
                  onSubmit={(e) => e.preventDefault()} // No submit action
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 justify-between">
                      <Label htmlFor="tip" className="text-sm font-medium">
                        Tip:
                      </Label>
                      <Button
                        variant="outline"
                        className="size-8"
                        onClick={() => setIsEditingTip(false)}
                      >
                        <X />
                      </Button>
                    </div>

                    <Tabs defaultValue="exact" className="">
                      <TabsList>
                        <TabsTrigger value="exact">Exact</TabsTrigger>
                        <TabsTrigger value="percentage">Percentage</TabsTrigger>
                      </TabsList>
                      <TabsContent value="exact" className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-lg pr-1 select-none">
                            $
                          </span>
                          <Input
                            type="number"
                            value={tip}
                            onChange={handleTipChange}
                            placeholder="Tip"
                            min={0}
                            step="0.01"
                            required
                            className="text-center"
                            id="tip"
                          />
                          <Button
                            onClick={handleSaveTip}
                            variant="outline"
                            className="size-8"
                            type="button"
                          >
                            <Check />
                          </Button>
                        </div>
                        <div className="text-muted-foreground text-sm flex justify-center">
                          percentage of total{" "}
                          {truncateToTwoDecimals((tip / itemsTotal) * 100)}%
                        </div>
                      </TabsContent>
                      <TabsContent value="percentage">
                        <div className="grid grid-flow-col gap-2">
                          <PercentageTipButton
                            percentage={10}
                            itemsTotal={itemsTotal}
                            onTipSelect={handlePercentageTipSelect}
                          />
                          <PercentageTipButton
                            percentage={15}
                            itemsTotal={itemsTotal}
                            onTipSelect={handlePercentageTipSelect}
                          />
                          <PercentageTipButton
                            percentage={20}
                            itemsTotal={itemsTotal}
                            onTipSelect={handlePercentageTipSelect}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </form>
              ) : (
                <>
                  <div
                    className="flex justify-between items-center py-1 sm:py-2"
                    onClick={handleEditTip}
                  >
                    <span className="text-base">Tip:</span>
                    <span className="text-base font-medium">
                      {formatCurrency(receipt_data.tip ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {(receipt_data.gratuity ?? 0) > 0 && (
            <div className="border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2">
              {isEditingGratuity ? (
                <form
                  className="flex flex-col gap-3 py-1 bg-background"
                  onSubmit={(e) => e.preventDefault()} // No submit action
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 justify-between">
                      <Label htmlFor="gratuity" className="text-sm font-medium">
                        Gratuity:
                      </Label>
                      <Button
                        variant="outline"
                        className="size-8"
                        onClick={() => setIsEditingGratuity(false)}
                      >
                        <X />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-lg pr-1 select-none">
                        $
                      </span>
                      <Input
                        type="number"
                        value={gratuity}
                        onChange={handleGratuityChange}
                        placeholder="Gratuity"
                        min={0}
                        step="1"
                        required
                        className="text-center"
                        id="gratuity"
                      />
                      <Button
                        onClick={handleSaveGratuity}
                        variant="outline"
                        className="size-8"
                        type="button"
                      >
                        <Check />
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div
                    className="flex justify-between items-center py-1 sm:py-2"
                    onClick={handleEditGratuity}
                  >
                    <span className="text-base">Gratuity:</span>
                    <span className="text-base font-medium">
                      {formatCurrency(receipt_data.gratuity ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

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
