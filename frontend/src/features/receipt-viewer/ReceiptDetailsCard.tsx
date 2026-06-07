import { Trans, useLingui } from '@lingui/react/macro';
import { domAnimation, LazyMotion, m } from 'framer-motion';
import { Calendar, QrCode, ShoppingBag, Tag } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/ui/kibo-ui/qr-code';

interface ReceiptDetailsCardProps {
  shareToken: string;
  merchant: string | null;
  date: Date | number | null;
}

/**
 * Receipt details card. The QR code encodes the canonical `/r/<share_token>`
 * URL — share_token is replicated via Zero so it's available the moment the
 * page renders, no extra round-trip.
 */
export const ReceiptDetailsCard = ({
  shareToken,
  merchant,
  date,
}: ReceiptDetailsCardProps) => {
  const { t, i18n } = useLingui();
  const [showQrCode, setShowQrCode] = useState(false);

  const shareUrl = `${window.location.origin}/r/${shareToken}`;

  // Format date - handle both Date objects and timestamps (seconds or milliseconds)
  const formatDate = (): string => {
    if (!date) return t`Unknown`;

    if (date instanceof Date) {
      return date.toLocaleDateString(i18n.locale);
    }

    // Heuristic: If the timestamp is less than Jan 1, 2000 in milliseconds (946684800000),
    // assume it's in seconds. This works for any reasonable receipt date.
    const timestamp = typeof date === 'number' ? date : 0;
    const YEAR_2000_MS = 946684800000;
    const dateObj = new Date(
      timestamp < YEAR_2000_MS ? timestamp * 1000 : timestamp
    );

    if (isNaN(dateObj.getTime())) {
      return t`Invalid Date`;
    }

    return dateObj.toLocaleDateString(i18n.locale);
  };

  return (
    <LazyMotion features={domAnimation}>
      <Card className="overflow-hidden border-0 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)]">
        <CardHeader className="px-4 pb-2 sm:px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <Trans>Document Details</Trans>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrCode(!showQrCode)}
            >
              <QrCode className="mr-1 h-4 w-4" />
              {showQrCode ? (
                <Trans>Hide QR Code</Trans>
              ) : (
                <Trans>Show QR Code</Trans>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5">
          {showQrCode && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center py-4"
            >
              <QRCode data={shareUrl} className="h-48 w-48" />
            </m.div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <Tag className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className="whitespace-nowrap text-base font-medium">
                <Trans>Merchant:</Trans>
              </span>
              <span className="ml-auto truncate text-base font-semibold">
                {merchant || t`Unknown`}
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-hidden">
              <Calendar className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className="whitespace-nowrap text-base font-medium">
                <Trans>Date:</Trans>
              </span>
              <span className="ml-auto truncate text-base font-semibold">
                {formatDate()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </LazyMotion>
  );
};
