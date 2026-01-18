import ReceiptHistory from '@/components/Receipt/ReceiptHistory';
import { Card } from '@/components/ui/card';
import { SignInPromptCard } from '@/features/auth/SignInPromptCard';
import { fromZeroReceipt } from '@/lib/receiptTypes';
import { queries } from '@/zero/queries';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const ReceiptsPage = () => {
  const [user, details] = useQuery(queries.users.receipts.byAuthUserId({}));

  // Transform Zero Query receipts to ReceiptHistoryItem format
  const transformedReceipts = useMemo(() => {
    if (!user?.receipts) {
      return [];
    }

    return user.receipts.map(fromZeroReceipt);
  }, [user?.receipts]);

  const isLoading = details.type === 'unknown';

  // Handle query errors (e.g., user not found)
  if (details.type === 'error') {
    return (
      <div className="px-1 py-8 sm:container">
        <Card className="p-6">
          <p className="text-destructive">
            Unable to load receipt history. Please try again later.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-1 py-8 sm:container">
      <SignedIn>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ReceiptHistory receipts={transformedReceipts} loading={isLoading} />
        </motion.div>
      </SignedIn>

      <SignedOut>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <SignInPromptCard />
        </motion.div>
      </SignedOut>
    </div>
  );
};

export default ReceiptsPage;
