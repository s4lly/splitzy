import { Trans, useLingui } from '@lingui/react/macro';
import { Divide } from 'lucide-react';
import { useState } from 'react';

import NumericInput from '@/components/NumericInput';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { Receipt } from '@/models/Receipt';

interface EvenSplitTabProps {
  receipt: Receipt;
  people: string[];
}

export const EvenSplitTab = ({ receipt, people }: EvenSplitTabProps) => {
  const { t } = useLingui();
  const [numberOfPeople, setNumberOfPeople] = useState(
    people.length > 0 ? people.length : 1
  );

  const calculatedTotal = calculations.final.getReceiptTotal(receipt);
  const evenlySplitTotalRounded = calculatedTotal
    .div(numberOfPeople)
    .toDecimalPlaces(2);
  const hasEvenlySplitDifference = calculatedTotal
    .minus(evenlySplitTotalRounded.mul(numberOfPeople))
    .abs()
    .toDecimalPlaces(2)
    .gte(0.01);

  return (
    <>
      <CardHeader className="px-0">
        <CardTitle className="flex items-center text-xl font-bold">
          <div className="flex items-center gap-3">
            <Divide className="h-6 w-6" />
            <Trans>Split Evenly</Trans>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="number-of-people">
            <Trans>Split between how many people?</Trans>
          </Label>
          <NumericInput
            id="number-of-people"
            value={numberOfPeople}
            onChange={setNumberOfPeople}
            min={1}
            placeholder={t`Number of people`}
          />
          <div className="mt-2 flex flex-col gap-2 border-t-2 border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">
                <Trans>Per Person:</Trans>
              </span>
              <span className="text-xl font-bold">
                {formatCurrency(evenlySplitTotalRounded)}
              </span>
            </div>
            {hasEvenlySplitDifference && (
              <p className="rounded-md bg-muted/30 px-3 py-2 text-center text-sm text-muted-foreground">
                <Trans>
                  Note: One person will pay an additional{' '}
                  {formatCurrency(
                    Math.abs(
                      calculatedTotal
                        .minus(evenlySplitTotalRounded.mul(numberOfPeople))
                        .toNumber()
                    )
                  )}{' '}
                  to cover the rounding difference
                </Trans>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </>
  );
};
