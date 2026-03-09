import { Trans } from '@lingui/react/macro';
import { Receipt, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

import receiptService from '@/services/receiptService';

export default function Footer() {
  const [apiStatus, setApiStatus] = useState<
    'checking' | 'healthy' | 'unhealthy'
  >('checking');

  useEffect(() => {
    const checkApiHealth = async () => {
      const isHealthy = await receiptService.checkHealth();
      setApiStatus(isHealthy ? 'healthy' : 'unhealthy');
    };

    checkApiHealth();
  }, []);

  return (
    <footer className="mt-auto border-t border-border bg-card/40 py-2">
      <div className="flex flex-col items-center justify-between gap-2 px-1 sm:container md:flex-row">
        <div className="flex items-center gap-1">
          <Receipt className="h-4 w-4" />
          <p className="text-xs font-medium">
            © {new Date().getFullYear()} Splitzy
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Server className="h-3.5 w-3.5" />
          <span>API</span>
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              apiStatus === 'healthy'
                ? 'bg-green-500'
                : apiStatus === 'checking'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          />
          <span>
            {apiStatus === 'healthy' ? (
              <Trans>healthy</Trans>
            ) : apiStatus === 'checking' ? (
              <Trans>checking</Trans>
            ) : (
              <Trans>unhealthy</Trans>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
