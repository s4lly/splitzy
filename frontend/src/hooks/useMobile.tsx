import { useState, useEffect } from 'react';


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
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Check if window is defined (browser environment)
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(max-width: 767px)');
      const onChange = (e: MediaQueryListEvent) => {
        setIsMobile(e.matches);
      };
      mql.addEventListener('change', onChange);
      setIsMobile(mql.matches);
      return () => {
        mql.removeEventListener('change', onChange);
      };
    }
  }, []);

  return isMobile;
}
