import { AlertCircle } from 'lucide-react';

interface NoLineItemsMessageProps {
  merchant?: string | null;
}

export const NoLineItemsMessage = ({ merchant }: NoLineItemsMessageProps) => {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800/30 dark:bg-amber-900/20">
      <AlertCircle className="mx-auto mb-2 h-10 w-10 text-amber-500 dark:text-amber-400" />
      <p className="mb-1 text-base font-medium text-amber-800 dark:text-amber-200">
        No Item Details Available
      </p>
      <p className="text-sm text-amber-700 dark:text-amber-300">
        This{' '}
        {merchant ? 'document from ' + merchant : 'document'}{' '}
        doesn't include detailed line items. The total amount has been equally
        divided among all people.
      </p>
    </div>
  );
};

