import { ClerkProvider } from '@clerk/react-router';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { FeatureFlagProvider } from './context/FeatureFlagProvider';
import './index.css';
import { POSTHOG_HOST } from './utils/constants';

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

const POSTHOG_PROJECT_API_KEY = import.meta.env
  .REACT_APP_POSTHOG_PROJECT_API_KEY;

if (!POSTHOG_PROJECT_API_KEY) {
  throw new Error('Add your PostHog Project API Key to the .env file');
}

const options = {
  api_host: POSTHOG_HOST,
  defaults: '2025-05-24',
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={POSTHOG_PROJECT_API_KEY}
      options={{ api_host: POSTHOG_HOST }}
    >
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
  </React.StrictMode>
);
