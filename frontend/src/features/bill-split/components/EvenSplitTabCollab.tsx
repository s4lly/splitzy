import NumericInput from '@/components/NumericInput';
import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import { calculations } from '@/components/Receipt/utils/receipt-calculation';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  assignmentsAtom,
  receiptAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useAtomValue } from 'jotai';
import { Divide } from 'lucide-react';
import { useEffect, useState } from 'react';

export const EvenSplitTabCollab = () => {
  const assignments = useAtomValue(assignmentsAtom);
  const receiptUserIds = assignments.map((a) => a.receiptUserId);
  const receipt = useAtomValue(receiptAtom);
  const [numberOfPeople, setNumberOfPeople] = useState(
    receiptUserIds.length > 0 ? receiptUserIds.length : 1
  );

  // Sync numberOfPeople when assignments array changes
  useEffect(() => {
    setNumberOfPeople(receiptUserIds.length > 0 ? receiptUserIds.length : 1);
  }, [receiptUserIds.length]);

  if (!receipt) {
    return null;
  }

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
