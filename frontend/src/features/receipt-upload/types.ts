export interface ReceiptUploaderProps {
  onContinue?: (file: File) => void;
}

export type ReceiptAnalysisResult =
  | { success: false; error?: string }
  | { success: true; is_receipt: false; receipt_data?: { reason?: string } }
  | { success: true; is_receipt: true; receipt_data: { id: number } };
