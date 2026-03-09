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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EditableDetail from '@/features/summary-card/EditableDetail';
import { cn } from '@/lib/utils';

interface TipEditorProps {
  receiptId: string;
  receiptTip: Decimal;
  itemsTotal: Decimal;
  receiptTax: Decimal;
  tipAfterTax: boolean;
}

const TipEditor = ({
  receiptId,
  receiptTip = new Decimal(0),
  itemsTotal,
  receiptTax,
  tipAfterTax: propTipAfterTax,
}: TipEditorProps) => {
  const [tip, setTip] = useState<Decimal>(receiptTip);
  const [inputValue, setInputValue] = useState(receiptTip.toFixed(2));
  const [isEditing, setIsEditing] = useState(false);
  const [tipAfterTax, setTipAfterTax] = useState(propTipAfterTax);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValueToDelete = !receiptTip.isZero();

  const tipBase = tipAfterTax ? itemsTotal.plus(receiptTax) : itemsTotal;

  useEffect(() => {
    setTip(receiptTip);
  }, [receiptTip]);

  useEffect(() => {
    setTipAfterTax(propTipAfterTax);
  }, [propTipAfterTax]);

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

    if (!nextCents.eq(currentCents) || tipAfterTax !== propTipAfterTax) {
      setError(null);
      mutate(
        {
          receiptId,
          // TODO update query to use Decimal
          tip: nextCents.div(100).toNumber(),
          tip_after_tax: tipAfterTax,
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
    setTipAfterTax(propTipAfterTax);
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
        tip_after_tax: tipAfterTax,
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

  const handleTipAfterTaxChange = (value: string) => {
    const newValue = value === 'after';
    setTipAfterTax(newValue);
    mutate(
      {
        receiptId,
        tip_after_tax: newValue,
      },
      {
        onError: (error) => {
          const errorMessage =
            error?.message || 'Failed to update setting. Please try again.';
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

          <div className="flex items-baseline justify-between">
            <Label htmlFor="tip" className="text-sm font-medium">
              Tip:
            </Label>
            <span className="text-sm text-muted-foreground">
              {tipBase.gt(0)
                ? calculations.utils.formatPercentage(tip, tipBase)
                : '—'}
            </span>
          </div>
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
            <Tabs
              value={tipAfterTax ? 'after' : 'before'}
              onValueChange={handleTipAfterTaxChange}
            >
              <TabsList className="w-full">
                <TabsTrigger value="before" className="flex-1">
                  Before tax
                </TabsTrigger>
                <TabsTrigger value="after" className="flex-1">
                  After tax
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {tipBase.gt(0) ? (
              <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Items total</span>
                  <span>{formatCurrency(itemsTotal)}</span>
                </div>
                {tipAfterTax && (
                  <>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>+ {formatCurrency(receiptTax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 font-medium">
                      <span>Tip base</span>
                      <span>{formatCurrency(tipBase)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-border pt-1">
                  <span>
                    {formatCurrency(tipBase)} ×{' '}
                    {calculations.utils.formatPercentage(tip, tipBase)}
                  </span>
                  <span className="font-medium">
                    = {formatCurrency(tip)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
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
              itemsTotal={tipBase}
              onTipSelect={handleQuickPercentageTip}
            />
            <PercentageTipButton
              percentage={15}
              itemsTotal={tipBase}
              onTipSelect={handleQuickPercentageTip}
            />
            <PercentageTipButton
              percentage={20}
              itemsTotal={tipBase}
              onTipSelect={handleQuickPercentageTip}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TipEditor;
