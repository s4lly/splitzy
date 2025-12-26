import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowLeft, Wrench } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { queries } from '@/zero/queries';
import { useQuery, useZero } from '@rocicorp/zero/react';

const ReceiptCollabPage = () => {
  const zero = useZero();
  const navigate = useNavigate();
  const { receiptId } = useParams();

  const parsedId = receiptId ? parseInt(receiptId, 10) : NaN;
  const isValidId = !Number.isNaN(parsedId);

  const [data, details] = useQuery(
    queries.receipts.byId({ id: isValidId ? parsedId : 0 }),
    { enabled: isValidId }
  );

  console.log('useQuery data:', data, 'details:', details);

  // Redirect to 404 if receiptId is missing or not a valid number
  if (!receiptId || !isValidId) {
    return <Navigate to="/404" replace />;
  }

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="mx-auto max-w-4xl py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Under Construction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Collaborative receipt editing is coming soon! This page will allow
              multiple users to edit receipts in real-time.
            </p>
            <div className="rounded-lg bg-muted/50 p-4 text-left">
              <p className="text-sm font-medium">Receipt ID: {receiptId}</p>
              <p className="text-xs text-muted-foreground">
                Zero Client ID: {zero.clientID}
              </p>
              {details && (
                <p className="text-xs text-muted-foreground">
                  Query Status: {details.type}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default ReceiptCollabPage;
