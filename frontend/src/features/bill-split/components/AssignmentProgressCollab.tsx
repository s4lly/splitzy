import { formatCurrency } from '@/components/Receipt/utils/format-currency';
import {
  isFullyAssignedAtom,
  personTotalsSumAtom,
  receiptTotalAtom,
  unassignedAmountAtom,
} from '@/features/receipt-collab/atoms/receiptAtoms';
import { useAtomValue } from 'jotai';
import { AlertCircle, Check } from 'lucide-react';

export const AssignmentProgressCollab = () => {
  const personTotalsSum = useAtomValue(personTotalsSumAtom);
  const receiptTotal = useAtomValue(receiptTotalAtom);
  const unassignedAmount = useAtomValue(unassignedAmountAtom);
  const isFullyAssigned = useAtomValue(isFullyAssignedAtom);

  return (
    <div
      className={`mb-4 rounded-lg border p-2 sm:p-3 ${
        isFullyAssigned
          ? 'border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900/30'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/20'
      }`}
    >
      <div className="mb-2 flex flex-col justify-between sm:flex-row sm:items-center">
        <div className="mb-2 flex items-center gap-2 sm:mb-0">
          {isFullyAssigned ? (
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
          <h3
            className={`font-medium ${
              isFullyAssigned
                ? 'text-green-800 dark:text-green-300'
                : 'text-amber-800 dark:text-amber-300'
            }`}
          >
            {isFullyAssigned ? 'All items assigned' : 'Assignment in progress'}
          </h3>
        </div>
        <span
          className={`text-sm font-semibold ${
            isFullyAssigned
              ? 'text-green-700 dark:text-green-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {formatCurrency(personTotalsSum)} / {formatCurrency(receiptTotal)}
        </span>
      </div>

      {!isFullyAssigned && (
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-amber-700 dark:text-amber-400">
            Unassigned amount:
          </span>
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {formatCurrency(unassignedAmount)}
          </span>
        </div>
      )}

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full ${
            isFullyAssigned
              ? 'bg-green-500 dark:bg-green-600'
              : 'bg-amber-500 dark:bg-amber-600'
          }`}
          style={{
            width: `${
              receiptTotal.isZero() || !receiptTotal.isFinite()
                ? 0
                : Math.min(
                    100,
                    personTotalsSum.div(receiptTotal).mul(100).toNumber()
                  )
            }%`,
          }}
        ></div>
      </div>
    </div>
  );
};
