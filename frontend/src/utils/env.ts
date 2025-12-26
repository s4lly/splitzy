/**
 * Check if the app is running in a local development environment.
 */
export const isLocalDevelopment = (): boolean => {
  return (
    // Vite built-in: true when running `vite dev`, false for `vite build`
    import.meta.env.DEV ||
    // Vercel system env var: automatically set to 'production', 'preview', or 'development'
    // Prefixed with VITE_ to expose to client-side code
    import.meta.env.VITE_VERCEL_ENV !== 'production' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
};
