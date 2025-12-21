import NumericInput from '@/components/NumericInput';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ReceiptSchema } from '@/lib/receiptSchemas';
import { Divide } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

interface EvenSplitTabProps {
  receiptData: z.infer<typeof ReceiptSchema>['receipt_data'];
}

export const EvenSplitTab = ({ receiptData }: EvenSplitTabProps) => {
  const [numberOfPeople, setNumberOfPeople] = useState(1);

  const calculatedTotal = calculations.final.getReceiptTotal(receiptData);
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
            Split Evenly
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="number-of-people">
            Split between how many people?
          </Label>
          <NumericInput
            id="number-of-people"
            value={numberOfPeople}
            onChange={setNumberOfPeople}
            min={1}
            placeholder="Number of people"
          />
          <div className="mt-2 flex flex-col gap-2 border-t-2 border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Per Person:</span>
              <span className="text-xl font-bold">
                {formatCurrency(evenlySplitTotalRounded)}
              </span>
            </div>
            {hasEvenlySplitDifference && (
              <p className="rounded-md bg-muted/30 px-3 py-2 text-center text-sm text-muted-foreground">
                Note: One person will pay an additional{' '}
                {formatCurrency(
                  Math.abs(
                    calculatedTotal
                      .minus(evenlySplitTotalRounded.mul(numberOfPeople))
                      .toNumber()
                  )
                )}{' '}
                to cover the rounding difference
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </>
  );
};
