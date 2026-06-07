import { Trans, useLingui } from '@lingui/react/macro';
import Decimal from 'decimal.js';
import { Trash } from 'lucide-react';

import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TipEditFormProps {
  inputValue: string;
  tipAfterTax: boolean;
  tipBase: Decimal;
  tip: Decimal;
  itemsTotal: Decimal;
  receiptTax: Decimal;
  hasValueToDelete: boolean;
  isSaving: boolean;
  focusInputOnMount: (node: HTMLInputElement | null) => void;
  handleTipChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputBlur: () => void;
  handleTipAfterTaxChange: (value: string) => void;
  handleDeleteTip: () => void;
  handleCancelTip: () => void;
  handleSaveTip: () => void;
}

const TipEditForm = ({
  inputValue,
  tipAfterTax,
  tipBase,
  tip,
  itemsTotal,
  receiptTax,
  hasValueToDelete,
  isSaving,
  focusInputOnMount,
  handleTipChange,
  handleInputBlur,
  handleTipAfterTaxChange,
  handleDeleteTip,
  handleCancelTip,
  handleSaveTip,
}: TipEditFormProps) => {
  const { t } = useLingui();

  return (
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
            ref={focusInputOnMount}
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
          <Button onClick={handleSaveTip} variant="outline" disabled={isSaving}>
            <Trans>Done</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TipEditForm;
