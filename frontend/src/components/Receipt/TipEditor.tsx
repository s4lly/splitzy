import { Plus, Trash } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { formatCurrency } from "./utils/format-currency";
import { useState, useEffect } from "react";
import { useReceiptDataUpdateMutation } from "./hooks/useReceiptDataUpdateMutation";
import PercentageTipButton from "./components/PercentageTipButton";
import ActionButtons from "./ActionButtons";

interface TipEditorProps {
  receiptId: string;
  receiptTip: number;
  itemsTotal: number;
}

const TipEditor = ({
  receiptId,
  receiptTip,
  itemsTotal,
}: TipEditorProps) => {
  const [tip, setTip] = useState(receiptTip ?? 0);
  const [isEditing, setIsEditing] = useState(false);

  const isValueEmpty = receiptTip === 0;

  useEffect(() => {
    setTip(receiptTip ?? 0);
  }, [receiptTip]);

  const { mutate } = useReceiptDataUpdateMutation();

  const handleEditTip = () => {
    setIsEditing(true);
  };

  const handleSaveTip = () => {
    setIsEditing(false);
    if (tip !== (receiptTip ?? 0)) {
      mutate({
        receiptId,
        tip: tip,
      });
    }
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTip(Number(e.target.value));
  };

  const handleDeleteTip = () => {
    mutate({
      receiptId,
      tip: 0,
    });
  };

  const handleCancelTip = () => {
    setIsEditing(false);
  };

  const handlePercentageTipSelect = (percentage: number) => {
    const calculatedTip = (itemsTotal * percentage) / 100;
    setTip(calculatedTip);
  };

  const truncateToTwoDecimals = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  if (isValueEmpty && !isEditing) {
    return (
      <div className="flex gap-2 justify-between items-center border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2">
        <span className="text-base">Tip:</span>
        <Button
          onClick={handleEditTip}
          variant="outline"
          className="size-8"
        >
          <Plus />
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-sm p-2 py-1 -ml-2 -mr-2 px-2">
      {isEditing ? (
        <form
          className="flex flex-col gap-3 py-1 bg-background"
          onSubmit={(e) => e.preventDefault()} // No submit action
        >
          <div className="flex flex-col gap-4">
            <Tabs defaultValue="exact" className="">
              <div className="flex items-center justify-between">
                <Label htmlFor="tip" className="text-sm font-medium">
                  Tip:
                </Label>

                <TabsList>
                  <TabsTrigger value="exact">Exact</TabsTrigger>
                  <TabsTrigger value="percentage">
                    Percentage
                  </TabsTrigger>
                </TabsList>
              </div>
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

            <ActionButtons
              isValueEmpty={isValueEmpty}
              onDelete={handleDeleteTip}
              onCancel={handleCancelTip}
              onSave={handleSaveTip}
            />
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
              {formatCurrency(receiptTip ?? 0)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default TipEditor;
