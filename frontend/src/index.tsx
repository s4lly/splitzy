import '@/index.css';

import { ClerkProvider } from '@clerk/react-router';
import { I18nProvider } from '@lingui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { PostHogConfig, PostHogInterface } from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from '@/App';
import { ThemeProvider } from '@/components/ThemeProvider';
import { FeatureFlagProvider } from '@/context/FeatureFlagProvider';
import { AuthenticatedZeroProvider } from '@/context/ZeroProvider';
import { activateLocale, getDefaultLocale, i18n } from '@/i18n';
import { POSTHOG_HOST } from '@/utils/constants';
import { isLocalDevelopment } from '@/utils/env';

// ---- Clerk ----

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

// ---- PostHog ----

const POSTHOG_PROJECT_API_KEY = import.meta.env
  .REACT_APP_POSTHOG_PROJECT_API_KEY;

if (!POSTHOG_PROJECT_API_KEY) {
  throw new Error('Add your PostHog Project API Key to the .env file');
}

const options: Partial<PostHogConfig> = {
  api_host: POSTHOG_HOST,
  loaded: (posthog: PostHogInterface) => {
    if (isLocalDevelopment()) {
      posthog.setPersonProperties({ environment: 'development' });
    }
  },
};

// ---- QueryClient ----

const queryClient = new QueryClient();

// ----

async function main() {
  await activateLocale(getDefaultLocale());

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container not found');
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <ThemeProvider attribute="class" defaultTheme="system">
            <PostHogProvider apiKey={POSTHOG_PROJECT_API_KEY} options={options}>
              <FeatureFlagProvider>
                <BrowserRouter>
                  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
                    <AuthenticatedZeroProvider>
                      <App />
                    </AuthenticatedZeroProvider>
                  </ClerkProvider>
                </BrowserRouter>
              </FeatureFlagProvider>
            </PostHogProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

main();
