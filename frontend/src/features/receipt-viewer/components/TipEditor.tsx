import PercentageTipButton from '@/components/Receipt/components/PercentageTipButton';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EditableDetail from '@/features/summary-card/EditableDetail';
import { cn } from '@/lib/utils';
import { mutators } from '@/zero/mutators';
import { useZero } from '@rocicorp/zero/react';
import Decimal from 'decimal.js';
import { Trash } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TipEditorProps {
  receiptTip: Decimal;
  itemsTotal: Decimal;
  receiptId: number;
}

/**
 * TipEditor component that allows editing and saving tip values.
 * Performs mutations using Zero mutators.
 */
const TipEditor = ({
  receiptTip = new Decimal(0),
  itemsTotal,
  receiptId,
}: TipEditorProps) => {
  const zero = useZero();
  const [tip, setTip] = useState<Decimal>(receiptTip);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasValueToDelete = !receiptTip.isZero();

  useEffect(() => {
    setTip(receiptTip);
  }, [receiptTip]);

  const handleEditTip = () => {
    setTip(receiptTip);
    setIsEditing(true);
  };

  const handleSaveTip = async () => {
    if (!receiptId) {
      console.error('Receipt ID is required to save tip');
      return;
    }

    setIsSaving(true);
    try {
      const result = zero.mutate(
        mutators.receipts.update({
          id: receiptId,
          tip: tip.toNumber(),
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error('Failed to update tip:', clientResult.error.message);
      } else {
        console.info('Successfully updated tip');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating tip:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Treat empty or "." as 0
    if (rawValue === '' || rawValue === '.') {
      setTip(new Decimal(0));
      return;
    }

    // Parse with Decimal, fallback to current value on invalid input
    let parsedValue: Decimal;
    try {
      parsedValue = new Decimal(rawValue);
    } catch {
      return; // Keep current value on invalid input
    }

    // Clamp to non-negative value
    const clampedValue = Decimal.max(0, parsedValue);

    // Round to two decimals
    const roundedValue = clampedValue.toDP(2);

    setTip(roundedValue);
  };

  const handleDeleteTip = async () => {
    if (!receiptId) {
      console.error('Receipt ID is required to delete tip');
      return;
    }

    setIsSaving(true);
    try {
      const result = zero.mutate(
        mutators.receipts.update({
          id: receiptId,
          tip: 0,
        })
      );

      const clientResult = await result.client;

      if (clientResult.type === 'error') {
        console.error('Failed to delete tip:', clientResult.error.message);
      } else {
        console.info('Successfully deleted tip');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting tip:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelTip = () => {
    setTip(receiptTip);
    setIsEditing(false);
  };

  const handlePercentageTipSelect = (amount: Decimal) => {
    setTip(amount.toDP(2));
  };

  if (!hasValueToDelete && !isEditing) {
    return (
      <div className="-ml-2 -mr-2 rounded-sm border">
        <EditableDetail
          label="Tip"
          value={formatCurrency(0)}
          onClick={handleEditTip}
        />
      </div>
    );
  }

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background px-2 py-2">
          <Tabs defaultValue="exact">
            <div className="flex items-center justify-between">
              <Label htmlFor="tip" className="text-sm font-medium">
                Tip:
              </Label>

              <TabsList>
                <TabsTrigger value="exact">Exact</TabsTrigger>
                <TabsTrigger value="percentage">Percentage</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="exact" className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="select-none pr-1 text-lg text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={tip.toNumber()}
                  onChange={handleTipChange}
                  placeholder="Tip"
                  min={0}
                  step="0.01"
                  required
                  className="text-center"
                  id="tip"
                />
              </div>
              <div className="flex justify-center text-sm text-muted-foreground">
                percentage of total{' '}
                {itemsTotal.gt(0)
                  ? calculations.utils.formatPercentage(tip, itemsTotal)
                  : '—'}
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

          <div
            className={cn(
              'flex justify-between',
              !hasValueToDelete && 'justify-end'
            )}
          >
            {hasValueToDelete && (
              <Button
                variant="outline"
                size="icon"
                className="border-red-500 text-red-500"
                onClick={handleDeleteTip}
                aria-label="Delete tip"
                disabled={isSaving}
              >
                <Trash className="size-4" />
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleCancelTip}
                variant="outline"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTip}
                variant="outline"
                disabled={isSaving}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EditableDetail
          label="Tip"
          value={formatCurrency(receiptTip)}
          onClick={handleEditTip}
        />
      )}
    </div>
  );
};

export default TipEditor;

