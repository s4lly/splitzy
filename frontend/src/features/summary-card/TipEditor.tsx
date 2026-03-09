import Decimal from 'decimal.js';
import { Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import PercentageTipButton from '@/components/Receipt/components/PercentageTipButton';
import { useReceiptDataUpdateMutation } from '@/components/Receipt/hooks/useReceiptDataUpdateMutation';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EditableDetail from '@/features/summary-card/EditableDetail';
import { cn } from '@/lib/utils';

interface TipEditorProps {
  receiptId: string;
  receiptTip: Decimal;
  itemsTotal: Decimal;
}

const TipEditor = ({
  receiptId,
  receiptTip = new Decimal(0),
  itemsTotal,
}: TipEditorProps) => {
  const [tip, setTip] = useState<Decimal>(receiptTip);
  const [inputValue, setInputValue] = useState(receiptTip.toFixed(2));
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValueToDelete = !receiptTip.isZero();

  useEffect(() => {
    setTip(receiptTip);
  }, [receiptTip]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const { mutate, isPending } = useReceiptDataUpdateMutation();

  const setTipAndInput = (value: Decimal) => {
    setTip(value);
    setInputValue(value.toFixed(2));
  };

  const handleEditTip = () => {
    setTipAndInput(receiptTip);
    setError(null);
    setIsEditing(true);
  };

  const handleSaveTip = () => {
    const currentCents = receiptTip.mul(100).trunc();
    const nextCents = Decimal.max(0, tip).mul(100).trunc();

    if (!nextCents.eq(currentCents)) {
      setError(null);
      mutate(
        {
          receiptId,
          // TODO update query to use Decimal
          tip: nextCents.div(100).toNumber(),
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

    // Allow empty and partial decimal input for typing
    if (rawValue === '' || rawValue === '.') {
      setInputValue(rawValue);
      setTip(new Decimal(0));
      return;
    }

    // Allow trailing dot or trailing dot-digits for mid-typing (e.g. "12." or "12.5")
    if (/^\d*\.?\d{0,2}$/.test(rawValue)) {
      setInputValue(rawValue);

      let parsedValue: Decimal;
      try {
        parsedValue = new Decimal(rawValue);
      } catch {
        return;
      }

      const clampedValue = Decimal.max(0, parsedValue);
      const roundedValue = clampedValue.toDP(2);
      setTip(roundedValue);
    }
  };

  const handleInputBlur = () => {
    setInputValue(tip.toFixed(2));
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
    setTipAndInput(receiptTip ?? new Decimal(0));
    setError(null);
    setIsEditing(false);
  };

  const handleQuickPercentageTip = (amount: Decimal) => {
    const roundedAmount = amount.toDP(2);
    setError(null);
    mutate(
      {
        receiptId,
        tip: roundedAmount.toNumber(),
      },
      {
        onError: (error) => {
          const errorMessage =
            error?.message || 'Failed to save tip. Please try again.';
          setError(errorMessage);
        },
      }
    );
  };

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background px-2 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          <Label htmlFor="tip" className="text-sm font-medium">
            Tip:
          </Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="select-none pr-1 text-lg text-muted-foreground">
                $
              </span>
              <Input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={handleTipChange}
                onBlur={handleInputBlur}
                placeholder="Tip"
                required
                className="text-center"
                id="tip"
                disabled={isPending}
              />
            </div>
            <div className="flex justify-center text-sm text-muted-foreground">
              percentage of total{' '}
              {itemsTotal.gt(0)
                ? calculations.utils.formatPercentage(tip, itemsTotal)
                : '—'}
            </div>

          </div>

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
                disabled={isPending}
                aria-label="Delete tip"
              >
                <Trash className="size-4" />
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleCancelTip}
                variant="outline"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTip}
                variant="outline"
                disabled={isPending}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <EditableDetail
            label="Tip"
            value={formatCurrency(receiptTip ?? 0)}
            onClick={handleEditTip}
          />
          <div className="grid grid-flow-col gap-2 px-2 pb-2">
            <PercentageTipButton
              percentage={10}
              itemsTotal={itemsTotal}
              onTipSelect={handleQuickPercentageTip}
            />
            <PercentageTipButton
              percentage={15}
              itemsTotal={itemsTotal}
              onTipSelect={handleQuickPercentageTip}
            />
            <PercentageTipButton
              percentage={20}
              itemsTotal={itemsTotal}
              onTipSelect={handleQuickPercentageTip}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TipEditor;
