import { useReceipt } from '@/context/ReceiptContext';

/**
 * Receipt viewer component that displays receipt data.
 * Uses ReceiptContext to access the receipt - must be within a ReceiptProvider.
 */
export const ReceiptViewer = () => {
  const receipt = useReceipt();

  return (
    <div>
      <h1>Receipt Viewer</h1>
      <pre>{JSON.stringify(receipt, null, 2)}</pre>
    </div>
  );
};
