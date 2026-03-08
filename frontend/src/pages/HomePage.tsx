import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ReceiptHistory from '@/components/Receipt/ReceiptHistory';
import ReceiptHistorySkeleton from '@/components/Receipt/ReceiptHistorySkeleton';
import { ReceiptUploader } from '@/features/receipt-upload';
import { useUserReceiptsQuery } from '@/hooks/useUserReceiptsQuery';
import receiptService from '@/services/receiptService';

const ReceiptHistorySection = () => {
  const { receipts } = useUserReceiptsQuery();
  return <ReceiptHistory receipts={receipts} loading={false} />;
};

const features = [
  {
    emoji: '📸',
    title: 'Scan any receipt',
    description:
      'Take a photo and we extract every line item automatically — no manual entry.',
  },
  {
    emoji: '🤝',
    title: 'Split fairly',
    description:
      'Assign items to people, split shared costs, and handle tips. No awkward math.',
  },
  {
    emoji: '📂',
    title: 'Track history',
    description: 'Every split is saved. Review, adjust, or settle up any time.',
    signInCta: true,
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: EASE },
});

const HomePage = () => {
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState('checking');

  React.useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const isHealthy = await receiptService.checkHealth();
        setApiStatus(isHealthy ? 'healthy' : 'unhealthy');
      } catch {
        setApiStatus('unhealthy');
      }
    };

    checkApiHealth();
  }, []);

  const handleAnalysisComplete = (result: any) => {
    if (result?.success && result?.receipt_data?.id) {
      navigate(`/receipt/${result.receipt_data.id}`);
    } else {
      console.error('Invalid receipt data received:', result);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4">
      {/* ── Hero ── */}
      <motion.section {...fadeUp(0)} className="pb-4 pt-8">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-accent px-3.5 py-1 text-xs font-medium tracking-wide text-accent-foreground">
            receipt splitting, simplified
          </span>
        </div>
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          Scan a receipt, divide costs fairly, settle up in seconds.
        </p>
      </motion.section>

      {/* ── Upload ── */}
      <motion.section {...fadeUp(0.1)} className="pb-5">
        <ReceiptUploader onAnalysisComplete={handleAnalysisComplete} />

        {apiStatus === 'unhealthy' && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <p className="text-destructive">
              Service temporarily unavailable. Please try again later.
            </p>
          </div>
        )}
      </motion.section>

      {/* ── Receipt history (signed-in only) ── */}
      <SignedIn>
        <motion.section {...fadeUp(0.2)} className="pb-6">
          <Suspense fallback={<ReceiptHistorySkeleton />}>
            <ReceiptHistorySection />
          </Suspense>
        </motion.section>
      </SignedIn>

      {/* ── How it works (below fold) ── */}
      <motion.section
        {...fadeUp(0.25)}
        className="border-t border-border pb-20 pt-8"
      >
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          how it works
        </p>
        <h2 className="mb-6 text-center font-display text-[1.4rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          From receipt to settled,
          <br />
          <span className="italic font-light">in a few taps.</span>
        </h2>

        <div className="flex flex-col gap-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.35 + i * 0.07,
                ease: EASE,
              }}
              className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] ring-1 ring-border/70"
            >
              <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-xl">
                {feature.emoji}
              </div>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {feature.signInCta && (
                  <SignedOut>
                    <SignInButton>
                      <button className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline">
                        Sign in to see your history →
                      </button>
                    </SignInButton>
                  </SignedOut>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;
