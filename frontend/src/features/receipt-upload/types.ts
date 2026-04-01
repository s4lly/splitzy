export interface ReceiptUploaderProps {
  onContinue?: (file: File) => void;
}

export interface ReceiptAnalysisResult {
  success: boolean;
  is_receipt?: boolean;
  error?: string;
  receipt_data?: {
    id: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
