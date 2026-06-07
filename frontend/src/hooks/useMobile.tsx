import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * A hook to detect if the user is on a mobile device based on screen width.
 *
 * This hook listens for changes in screen size and returns `true` if the
 * screen width is less than the mobile breakpoint (768px).
 *
 * @returns {boolean} `true` if the screen width is less than the mobile breakpoint, otherwise `false`.
 *
 * @example
 * ```tsx
 * import { useMobile } from './useMobile';
 *
 * function MyComponent() {
 *   const isMobile = useMobile();
 *
 *   return (
 *     <div>
 *       {isMobile ? <p>Mobile view</p> : <p>Desktop view</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
