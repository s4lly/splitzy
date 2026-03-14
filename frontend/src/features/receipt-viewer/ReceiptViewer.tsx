import { Trans } from '@lingui/react/macro';

import { Separator } from '@/components/ui/separator';
import { useReceipt } from '@/context/ReceiptContext';

/**
 * Receipt viewer component that displays receipt data.
 * Uses ReceiptContext to access the receipt - must be within a ReceiptProvider.
 */
export const ReceiptViewer = () => {
  const receipt = useReceipt();

  return (
    <div className="flex flex-col gap-4">
      <Separator />

      <h1>
        <Trans>Receipt Viewer</Trans>
      </h1>

      <pre className="max-w-full overflow-x-auto">
        {JSON.stringify(receipt, null, 2)}
      </pre>
    </div>
  );
};
