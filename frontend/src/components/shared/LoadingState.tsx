import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

/**
 * Shared loading state component for receipt loading
 */
export const LoadingState = ({ message = 'Loading...' }: LoadingStateProps) => (
  <div className="mx-auto max-w-4xl py-8">
    <output
      className="flex h-64 items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-10 w-10 animate-spin text-primary"
        aria-hidden="true"
      />
      <span className="ml-2 text-lg">{message}</span>
    </output>
  </div>
);
