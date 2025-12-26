// @ts-nocheck
import AuthenticatedOnly from '@/components/Auth/AuthenticatedOnly';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import HomePage from '@/pages/HomePage';
import ReceiptAnalysisPage from '@/pages/ReceiptAnalysisPage';
import ReceiptCollabPage from '@/pages/ReceiptCollabPage';
import SettingsPage from '@/pages/SettingsPage';
import { Loader2 } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { Link, Route, Routes } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="text-primary underline hover:no-underline">
        Go back home
      </Link>
    </div>
  );
}

function ReceiptRoute() {
  const isCollabEnabled = useFeatureFlagEnabled('receipt-collab-edit');

  // Wait for PostHog to initialize - don't render either page until flag resolves
  if (isCollabEnabled === undefined) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return isCollabEnabled ? <ReceiptCollabPage /> : <ReceiptAnalysisPage />;
}

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* Main Content */}
      <main className="w-full flex-1 px-0 py-0 sm:container">
        <Routes>
          {/* TODO: add back when configured with router and pages implemented */}
          {/* <Route path="/auth" element={<AuthLayout />}>
            <Route path="sign-in" element={<SignInPage />} />
            <Route path="sign-up" element={<SignUpPage />} />
          </Route> */}

          {/* Home */}
          <Route path="/" element={<HomePage />} />

          {/* Receipt */}
          <Route path="/receipt/:receiptId" element={<ReceiptRoute />} />

          {/* Settings (protected) */}
          <Route
            path="/settings"
            element={
              <AuthenticatedOnly>
                <SettingsPage />
              </AuthenticatedOnly>
            }
          />

          {/* 404 catch-all - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
