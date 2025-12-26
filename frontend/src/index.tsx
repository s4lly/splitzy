import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { FeatureFlagProvider } from '@/context/FeatureFlagProvider';
import '@/index.css';
import { POSTHOG_HOST } from '@/utils/constants';
import { ClerkProvider } from '@clerk/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

import type { ZeroOptions } from '@rocicorp/zero';
import { ZeroProvider } from '@rocicorp/zero/react';
import { v4 as uuidv4 } from 'uuid';
import { schema } from './zero/schema';

// ---- Zero ----

const zeroOptions: ZeroOptions = {
  cacheURL: import.meta.env.VITE_ZERO_CACHE_URL,
  queryURL: import.meta.env.VITE_ZERO_QUERY_URL,
  mutateURL: import.meta.env.VITE_ZERO_MUTATE_URL,
  schema,
  userID: uuidv4(),
};

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

const options = {
  api_host: POSTHOG_HOST,
};

// ---- QueryClient ----

const queryClient = new QueryClient();

// ----

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <ZeroProvider {...zeroOptions}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system">
          <PostHogProvider apiKey={POSTHOG_PROJECT_API_KEY} options={options}>
            <FeatureFlagProvider>
              <BrowserRouter>
                <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
                  <AuthProvider>
                    <App />
                  </AuthProvider>
                </ClerkProvider>
              </BrowserRouter>
            </FeatureFlagProvider>
          </PostHogProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </ZeroProvider>
  </React.StrictMode>
);
