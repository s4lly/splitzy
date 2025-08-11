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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <PostHogProvider apiKey={POSTHOG_PROJECT_API_KEY} options={options}>
      <FeatureFlagProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </FeatureFlagProvider>
    </PostHogProvider>
  </React.StrictMode>
);
