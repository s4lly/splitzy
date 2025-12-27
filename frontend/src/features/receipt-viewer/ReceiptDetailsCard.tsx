import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/ui/kibo-ui/qr-code';
import { useReceipt } from '@/context/ReceiptContext';
import { motion } from 'framer-motion';
import { Calendar, QrCode, ShoppingBag, Tag } from 'lucide-react';
import { useState } from 'react';

/**
 * Receipt details card component that displays merchant and date information.
 * Uses ReceiptContext to access receipt data - must be within a ReceiptProvider.
 * Includes a QR code toggle to display the current page URL.
 */
export const ReceiptDetailsCard = () => {
  const receipt = useReceipt();
  const [showQrCode, setShowQrCode] = useState(false);

  return (
    <Card className="overflow-hidden rounded-none border-2 shadow-md sm:rounded-lg">
      <CardHeader className="px-3 pb-2 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <ShoppingBag className="h-6 w-6" />
            Document Details
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQrCode(!showQrCode)}
          >
            <QrCode className="mr-1 h-4 w-4" />
            {showQrCode ? 'Hide QR Code' : 'Show QR Code'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {showQrCode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center py-4"
          >
            <QRCode data={window.location.href} className="h-48 w-48" />
          </motion.div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <Tag className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <span className="whitespace-nowrap text-base font-medium">
              Merchant:
            </span>
            <span className="ml-auto truncate text-base font-semibold">
              {receipt.merchant || 'Unknown'}
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-hidden">
            <Calendar className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <span className="whitespace-nowrap text-base font-medium">
              Date:
            </span>
            <span className="ml-auto truncate text-base font-semibold">
              {receipt.date
                ? new Date(
                    receipt.date < 1e12 ? receipt.date * 1000 : receipt.date
                  ).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
