// @ts-nocheck
import AuthenticatedOnly from '@/components/Auth/AuthenticatedOnly';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import NotFound from '@/components/routes/NotFound';
import ReceiptRoute from '@/components/routes/ReceiptRoute';
import { Toaster } from '@/components/ui/sonner';
import HomePage from '@/pages/HomePage';
import ReceiptsPage from '@/pages/ReceiptsPage';
import SettingsPage from '@/pages/SettingsPage';
import { Route, Routes } from 'react-router-dom';

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
