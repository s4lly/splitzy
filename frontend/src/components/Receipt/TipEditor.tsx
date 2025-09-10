import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { formatCurrency } from './utils/format-currency';
import { useState, useEffect } from 'react';
import { useReceiptDataUpdateMutation } from './hooks/useReceiptDataUpdateMutation';
import PercentageTipButton from './components/PercentageTipButton';
import ActionButtons from './ActionButtons';
import ClickableRow from './components/ClickableRow';
import AddableRow from './components/AddableRow';

interface TipEditorProps {
  receiptId: string;
  receiptTip: number;
  itemsTotal: number;
}

const TipEditor = ({ receiptId, receiptTip, itemsTotal }: TipEditorProps) => {
  const [tip, setTip] = useState(receiptTip ?? 0);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValueToDelete = receiptTip !== 0;

  useEffect(() => {
    setTip(receiptTip ?? 0);
  }, [receiptTip]);

  const { mutate, isPending } = useReceiptDataUpdateMutation();

  const handleEditTip = () => {
    setTip(receiptTip ?? 0);
    setError(null);
    setIsEditing(true);
  };

  const handleSaveTip = () => {
    const currentCents = Math.round((receiptTip ?? 0) * 100);
    const nextCents = Math.round(Math.max(0, tip) * 100);

    if (nextCents !== currentCents) {
      setError(null);
      mutate(
        {
          receiptId,
          tip: nextCents / 100,
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            setError(null);
          },
          onError: (error) => {
            const errorMessage =
              error?.message || 'Failed to save tip. Please try again.';
            setError(errorMessage);
          },
        }
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Treat empty or "." as 0
    if (rawValue === '' || rawValue === '.') {
      setTip(0);
      return;
    }

    // Parse with parseFloat, fallback to 0 on NaN
    const parsedValue = parseFloat(rawValue) || 0;

    // Clamp to non-negative value
    const clampedValue = Math.max(0, parsedValue);

    // Round to two decimals
    const roundedValue = roundToTwoDecimals(clampedValue);

    setTip(roundedValue);
  };

  const handleDeleteTip = () => {
    setError(null);
    mutate(
      {
        receiptId,
        tip: 0,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setError(null);
        },
        onError: (error) => {
          const errorMessage =
            error?.message || 'Failed to delete tip. Please try again.';
          setError(errorMessage);
        },
      }
    );
  };

  const handleCancelTip = () => {
    setTip(receiptTip ?? 0);
    setError(null);
    setIsEditing(false);
  };

  const handlePercentageTipSelect = (amount: number) => {
    const roundedAmount = roundToTwoDecimals(amount);
    setTip(roundedAmount);
  };

  const roundToTwoDecimals = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  if (!hasValueToDelete && !isEditing) {
    return <AddableRow label="Tip" onClick={handleEditTip} />;
  }

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background px-2 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          <Tabs defaultValue="exact" className="">
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
                  value={tip}
                  onChange={handleTipChange}
                  placeholder="Tip"
                  min={0}
                  step="0.01"
                  required
                  className="text-center"
                  id="tip"
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-center text-sm text-muted-foreground">
                percentage of total{' '}
                {itemsTotal > 0
                  ? `${roundToTwoDecimals((tip / itemsTotal) * 100)}%`
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

          <ActionButtons
            shouldShowDeleteButton={hasValueToDelete}
            onDelete={handleDeleteTip}
            onCancel={handleCancelTip}
            onSave={handleSaveTip}
            isPending={isPending}
          />
        </div>
      ) : (
        <ClickableRow
          label="Tip"
          value={formatCurrency(receiptTip ?? 0)}
          onClick={handleEditTip}
        />
      )}
    </div>
  );
};

export default TipEditor;
