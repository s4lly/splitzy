import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from 'lucide-react';

/**
 * Skeleton loading component for ReceiptHistory
 * Extracted to maintain consistency between Suspense fallbacks and loading states
 */
const ReceiptHistorySkeleton = () => {
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4">
            <Skeleton className="mb-2 h-24 w-full rounded-md" />
            <div className="flex justify-between">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ReceiptHistorySkeleton;
