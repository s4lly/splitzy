import { AlertCircle } from 'lucide-react';

interface EqualSplitBannerProps {
  receiptHasLineItems: boolean;
}

export const EqualSplitBanner = ({
  receiptHasLineItems,
}: EqualSplitBannerProps) => {
  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/30 dark:bg-blue-900/20">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <h3 className="font-medium text-blue-800 dark:text-blue-300">
            Equal Split Mode
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {!receiptHasLineItems
              ? "This receipt doesn't contain detailed line items, so the total amount has been divided equally among all people."
              : 'No items have been assigned yet. The total has been divided equally among all people by default.'}
          </p>
        </div>
      </div>
    </div>
  );
};

