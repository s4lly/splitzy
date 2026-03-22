import { Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import PercentageTipButton from '@/components/Receipt/components/PercentageTipButton';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReceiptMutation } from '@/features/receipt-viewer/hooks/useReceiptMutation';
import EditableDetail from '@/features/summary-card/EditableDetail';
import { cn } from '@/lib/utils';

interface TipEditorProps {
  receiptTip: Decimal;
  originalTip: Decimal | null;
  itemsTotal: Decimal;
  receiptTax: Decimal;
  tipAfterTax: boolean;
  receiptId: number;
}

/**
 * TipEditor component that allows editing and saving tip values.
 * Performs mutations using Zero mutators.
 */
const TipEditor = ({
  receiptTip = new Decimal(0),
  originalTip,
  itemsTotal,
  receiptTax,
  tipAfterTax: propTipAfterTax,
  receiptId,
}: TipEditorProps) => {
  const { t } = useLingui();
  const [tip, setTip] = useState<Decimal>(receiptTip);
  const [inputValue, setInputValue] = useState(receiptTip.toFixed(2));
  const [isEditing, setIsEditing] = useState(false);
  const [tipAfterTax, setTipAfterTax] = useState(propTipAfterTax);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValueToDelete = !receiptTip.isZero();

  const tipBase = tipAfterTax ? itemsTotal.plus(receiptTax) : itemsTotal;

  const isOriginalTip =
    originalTip != null && receiptTip.eq(originalTip) && !receiptTip.isZero();

  const activePercentage = tipBase.gt(0)
    ? (() => {
        const ratio = receiptTip.div(tipBase).toNumber();
        for (const pct of [10, 15, 20]) {
          if (Math.abs(ratio - pct / 100) < 0.005) return pct;
        }
        return null;
      })()
    : null;

  const { mutate, isSaving } = useReceiptMutation({
    onSuccess: () => setIsEditing(false),
  });

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

  const setTipAndInput = (value: Decimal) => {
    setTip(value);
    setInputValue(value.toFixed(2));
  };

  const handleEditTip = () => {
    setTipAndInput(receiptTip);
    setIsEditing(true);
  };

  const handleSaveTip = async () => {
    await mutate({
      id: receiptId,
      tip: tip.toNumber(),
      tip_after_tax: tipAfterTax,
    });
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

  const handleDeleteTip = async () => {
    await mutate({
      id: receiptId,
      tip: 0,
    });
  };

  const handleCancelTip = () => {
    setTipAndInput(receiptTip);
    setTipAfterTax(propTipAfterTax);
    setIsEditing(false);
  };

  const handleQuickPercentageTip = (amount: Decimal) => {
    const roundedAmount = amount.toDP(2);
    mutate({
      id: receiptId,
      tip: roundedAmount.toNumber(),
      tip_after_tax: tipAfterTax,
    });
  };

  const handleTipAfterTaxChange = (value: string) => {
    setTipAfterTax(value === 'after');
  };

  return (
    <div className="-ml-2 -mr-2 rounded-sm border">
      {isEditing ? (
        <div className="flex flex-col gap-4 bg-background px-2 py-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="tip" className="text-sm font-medium">
              <Trans>Tip:</Trans>
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
                placeholder={t`Tip`}
                required
                className="text-center"
                id="tip"
                disabled={isSaving}
              />
            </div>
            <Tabs
              value={tipAfterTax ? 'after' : 'before'}
              onValueChange={handleTipAfterTaxChange}
            >
              <TabsList className="w-full">
                <TabsTrigger value="before" className="flex-1">
                  <Trans>Before tax</Trans>
                </TabsTrigger>
                <TabsTrigger value="after" className="flex-1">
                  <Trans>After tax</Trans>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {tipBase.gt(0) ? (
              <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>
                    <Trans>Items total</Trans>
                  </span>
                  <span>{formatCurrency(itemsTotal)}</span>
                </div>
                {tipAfterTax && (
                  <>
                    <div className="flex justify-between">
                      <span>
                        <Trans>Tax</Trans>
                      </span>
                      <span>+ {formatCurrency(receiptTax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 font-medium">
                      <span>
                        <Trans>Tip base</Trans>
                      </span>
                      <span>{formatCurrency(tipBase)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-border pt-1">
                  <span>
                    {formatCurrency(tipBase)} ×{' '}
                    {calculations.utils.formatPercentage(tip, tipBase)}
                  </span>
                  <span className="font-medium">= {formatCurrency(tip)}</span>
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
                aria-label={t`Delete tip`}
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
                <Trans>Cancel</Trans>
              </Button>
              <Button
                onClick={handleSaveTip}
                variant="outline"
                disabled={isSaving}
              >
                <Trans>Done</Trans>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <EditableDetail
            label={t`Tip`}
            value={formatCurrency(receiptTip)}
            onClick={handleEditTip}
          />
          {isOriginalTip && (
            <div className="px-2 pb-1 text-xs text-muted-foreground">
              <Trans>Tip from original receipt</Trans>
            </div>
          )}
          <div className="grid grid-flow-col gap-2 px-2 pb-2">
            <PercentageTipButton
              percentage={10}
              itemsTotal={tipBase}
              onTipSelect={handleQuickPercentageTip}
              isActive={activePercentage === 10}
            />
            <PercentageTipButton
              percentage={15}
              itemsTotal={tipBase}
              onTipSelect={handleQuickPercentageTip}
              isActive={activePercentage === 15}
            />
            <PercentageTipButton
              percentage={20}
              itemsTotal={tipBase}
              onTipSelect={handleQuickPercentageTip}
              isActive={activePercentage === 20}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TipEditor;
