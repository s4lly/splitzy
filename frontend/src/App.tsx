// @ts-nocheck
import { Route, Routes } from 'react-router-dom';

import AuthenticatedOnly from '@/components/Auth/AuthenticatedOnly';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import NotFound from '@/components/routes/NotFound';
import ReceiptRoute from '@/components/routes/ReceiptRoute';
import { Toaster } from '@/components/ui/sonner';
import HomePage from '@/pages/HomePage';
import ImagePrepPage from '@/pages/ImagePrepPage';
import PreviewPage from '@/pages/PreviewPage';
import ReceiptsPage from '@/pages/ReceiptsPage';
import SettingsPage from '@/pages/SettingsPage';

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:inline-block focus-visible:h-auto focus-visible:w-auto focus-visible:overflow-visible focus-visible:rounded-md focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:[clip:auto] focus-visible:[margin:0]"
      >
        Skip to main content
      </a>
      <Header />

      {/* Main Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full flex-1 px-0 py-0 sm:container"
      >
        <Routes>
          {/* TODO: add back when configured with router and pages implemented */}
          {/* <Route path="/auth" element={<AuthLayout />}>
            <Route path="sign-in" element={<SignInPage />} />
            <Route path="sign-up" element={<SignUpPage />} />
          </Route> */}

          {/* Home */}
          <Route path="/" element={<HomePage />} />

          {/* Image preparation (pre-analysis) */}
          <Route path="/prepare" element={<ImagePrepPage />} />

          {/* Preview processed image before sending to analyze */}
          <Route path="/preview" element={<PreviewPage />} />

          {/* Receipts list */}
          <Route path="/receipts" element={<ReceiptsPage />} />

          {/* Receipt - RESTful plural form */}
          <Route path="/receipts/:receiptId" element={<ReceiptRoute />} />
          {/* Receipt - legacy singular form (backward compatibility) */}
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
      <Toaster />
    </div>
  );
}

export default App;
