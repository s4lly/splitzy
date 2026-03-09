import { useEffect } from 'react';

const DEFAULT_TITLE = 'Splitzy';

/**
 * Sets document.title to the given value and restores the previous title on unmount.
 * Use per page for WCAG 2.4.2 (Page Titled).
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
