import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ReceiptHistoryItem } from '@/lib/receiptTypes';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, Eye, Receipt, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReceiptHistorySkeleton from './ReceiptHistorySkeleton';

interface ReceiptHistoryProps {
  receipts: ReceiptHistoryItem[];
  loading?: boolean;
}

const ReceiptHistory = ({ receipts, loading = false }: ReceiptHistoryProps) => {
  const navigate = useNavigate();

  const handleViewReceipt = (receiptId: number) => {
    navigate(`/receipts/${receiptId}`);
  };

  if (loading) {
    return <ReceiptHistorySkeleton />;
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Receipt History
        </CardTitle>
        <CardDescription>Your previously analyzed receipts</CardDescription>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Receipt className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No receipt history found</p>
            <p className="mt-1 text-sm">Upload a receipt to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt, index) => (
              <motion.div
                key={receipt.id}
                className="rounded-lg border p-3 transition-colors hover:bg-accent/5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="flex items-center gap-1 font-medium">
                      <Store className="h-4 w-4" />
                      {receipt.merchant || 'Unknown Merchant'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ${receipt.total?.toFixed(2) || '0.00'} •{' '}
                      {receipt.date
                        ? new Intl.DateTimeFormat('en-US', {
                            dateStyle: 'medium',
                          }).format(receipt.date)
                        : 'Unknown date'}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {receipt.created_at
                      ? formatDistanceToNow(receipt.created_at, {
                          addSuffix: true,
                        })
                      : 'Unknown'}
                  </div>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReceipt(receipt.id)}
                    className="h-8"
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptHistory;
