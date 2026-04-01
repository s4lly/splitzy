import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@rocicorp/zero/react';
import { motion } from 'framer-motion';
import { useSetAtom } from 'jotai';
import { AlertCircle } from 'lucide-react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ReceiptHistory from '@/components/Receipt/ReceiptHistory';
import ReceiptHistorySkeleton from '@/components/Receipt/ReceiptHistorySkeleton';
import { Card } from '@/components/ui/card';
import {
  completedCropAtom,
  cropAtom,
  eraseRectsAtom,
  imageDimsAtom,
} from '@/features/image-prep/atoms/imagePrepStateAtoms';
import { pendingImageAtom } from '@/features/image-prep/atoms/pendingImageAtom';
import { ReceiptUploader } from '@/features/receipt-upload';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fromZeroReceipt } from '@/lib/receiptTypes';
import { queries } from '@/zero/queries';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ReceiptHistorySection = () => {
  const [user, details] = useQuery(queries.users.receipts.byAuthUserId({}));
  const receipts = useMemo(
    () => (user?.receipts ? user.receipts.map(fromZeroReceipt) : []),
    [user?.receipts]
  );
  const isLoading = details.type === 'unknown';

  if (details.type === 'error') {
    return (
      <Card className="p-6">
        <p className="text-destructive">
          <Trans>Unable to load receipt history. Please try again later.</Trans>
        </p>
      </Card>
    );
  }

  return <ReceiptHistory receipts={receipts} loading={isLoading} />;
};

const features = [
  {
    emoji: '📸',
    title: msg`Scan any receipt`,
    description: msg`Take a photo and we extract every line item automatically — no manual entry.`,
  },
  {
    emoji: '🤝',
    title: msg`Split fairly`,
    description: msg`Assign items to people, split shared costs, and handle tips. No awkward math.`,
  },
  {
    emoji: '📂',
    title: msg`Track history`,
    description: msg`Every split is saved. Review, adjust, or settle up any time.`,
    signInCta: true,
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = (delay = 0, reducedMotion = false) =>
  reducedMotion
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay, ease: EASE },
      };

const HomePage = () => {
  const navigate = useNavigate();
  const setPendingImage = useSetAtom(pendingImageAtom);
  const setCrop = useSetAtom(cropAtom);
  const setCompletedCrop = useSetAtom(completedCropAtom);
  const setImageDims = useSetAtom(imageDimsAtom);
  const setEraseRects = useSetAtom(eraseRectsAtom);
  const [apiStatus, setApiStatus] = useState('checking');
  const shouldReduceMotion = useReducedMotion();
  const { t } = useLingui();

  useDocumentTitle('Home');

  React.useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) {
          setApiStatus('unhealthy');
          return;
        }
        const data = await response.json();
        setApiStatus(data.status === 'healthy' ? 'healthy' : 'unhealthy');
      } catch {
        setApiStatus('unhealthy');
      }
    };

    checkApiHealth();
  }, []);

  const handleContinue = useCallback(
    (file: File) => {
      setCrop(undefined);
      setCompletedCrop(null);
      setImageDims(null);
      setEraseRects([]);
      setPendingImage(file);
      navigate('/prepare');
    },
    [
      navigate,
      setCrop,
      setCompletedCrop,
      setImageDims,
      setEraseRects,
      setPendingImage,
    ]
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-10 pt-8">
      <h1 className="sr-only">Splitzy</h1>

      {/* ── Upload ── */}
      <motion.section {...fadeUp(0.1, shouldReduceMotion)}>
        <ReceiptUploader onContinue={handleContinue} />

        {apiStatus === 'unhealthy' && (
          <div
            role="alert"
            className="bg-destructive/8 mt-3 flex items-start gap-3 rounded-xl border border-destructive/25 p-4 text-sm"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="text-destructive">
              <Trans>
                Service temporarily unavailable. Please try again later.
              </Trans>
            </p>
          </div>
        )}
      </motion.section>

      {/* ── Hero ── */}
      <motion.section {...fadeUp(0, shouldReduceMotion)}>
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-accent px-3.5 py-1 text-xs font-medium tracking-wide text-accent-foreground">
            <Trans>receipt splitting, simplified</Trans>
          </span>
        </div>
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          <Trans>
            Scan a receipt, divide costs fairly, settle up in seconds.
          </Trans>
        </p>
      </motion.section>

      {/* ── Receipt history (signed-in only) ── */}
      <SignedIn>
        <motion.section {...fadeUp(0.2, shouldReduceMotion)}>
          <Suspense fallback={<ReceiptHistorySkeleton />}>
            <ReceiptHistorySection />
          </Suspense>
        </motion.section>
      </SignedIn>

      {/* ── How it works (below fold) ── */}
      <motion.section
        {...fadeUp(0.25, shouldReduceMotion)}
        className="border-t border-border pt-6"
      >
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Trans>how it works</Trans>
        </p>
        <h2 className="mb-6 text-center font-display text-[1.4rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          <Trans>
            From receipt to settled,
            <br />
            <span className="font-light italic">in a few taps.</span>
          </Trans>
        </h2>

        <div className="flex flex-col gap-3">
          {features.map((feature, i) => (
            <motion.div
              key={t(feature.title)}
              initial={
                shouldReduceMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 10 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.4,
                      delay: 0.35 + i * 0.07,
                      ease: EASE,
                    }
              }
              className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] ring-1 ring-border/70"
            >
              <div
                className="mt-1 flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-xl"
                aria-hidden="true"
              >
                {feature.emoji}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t(feature.title)}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {t(feature.description)}
                </p>
                {feature.signInCta && (
                  <SignedOut>
                    <SignInButton>
                      <button className="mt-2 min-h-[24px] min-w-[24px] text-xs font-semibold text-primary underline-offset-2 hover:underline">
                        <Trans>Sign in to see your history →</Trans>
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
