// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PostHogProvider } from "posthog-js/react";
import { POSTHOG_HOST } from "./utils/constants";
import { FeatureFlagProvider } from "./context/FeatureFlagProvider";

const POSTHOG_PROJECT_API_KEY = import.meta.env
  .REACT_APP_POSTHOG_PROJECT_API_KEY;

const options = {
  api_host: POSTHOG_HOST,
  defaults: "2025-05-24",
};

// Extract shared JSX content to avoid duplication
const appContent = (
  <FeatureFlagProvider>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </FeatureFlagProvider>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {Boolean(POSTHOG_PROJECT_API_KEY) ? (
      <PostHogProvider apiKey={POSTHOG_PROJECT_API_KEY} options={options}>
        {appContent}
      </PostHogProvider>
    ) : (
      (() => {
        console.info(
          "PostHog API key not found, skipping PostHogProvider initialization"
        );
        return appContent;
      })()
    )}
  </React.StrictMode>
);
