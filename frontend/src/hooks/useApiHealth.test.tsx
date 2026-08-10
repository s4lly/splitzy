import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { useApiHealth } from '@/hooks/useApiHealth';
import { server } from '@/mocks/server';

const API_URL =
  import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const renderWithClient = <T,>(hook: () => T) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(hook, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe('useApiHealth', () => {
  it('reports checking until the backend answers, then healthy', async () => {
    const { result } = renderWithClient(() => useApiHealth());

    expect(result.current).toBe('checking');
    await waitFor(() => expect(result.current).toBe('healthy'));
  });

  it('reports unhealthy when the backend reports a non-healthy status', async () => {
    server.use(
      http.get(`${API_URL}/health`, () =>
        HttpResponse.json({ status: 'degraded' })
      )
    );

    const { result } = renderWithClient(() => useApiHealth());

    await waitFor(() => expect(result.current).toBe('unhealthy'));
  });

  it('reports unhealthy when the health endpoint fails', async () => {
    server.use(
      http.get(
        `${API_URL}/health`,
        () => new HttpResponse(null, { status: 500 })
      )
    );

    const { result } = renderWithClient(() => useApiHealth());

    await waitFor(() => expect(result.current).toBe('unhealthy'));
  });

  it('gives every consumer of the shared query key the same status', async () => {
    const { result } = renderWithClient(() => ({
      first: useApiHealth(),
      second: useApiHealth(),
    }));

    await waitFor(() => expect(result.current.first).toBe('healthy'));
    expect(result.current.second).toBe('healthy');
  });
});
