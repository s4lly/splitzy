import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorStateProps {
  message: string;
}

/**
 * Shared error state component for receipt loading errors
 */
export const ErrorState = ({ message }: ErrorStateProps) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl py-8">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-6">
        <AlertCircle className="h-6 w-6 flex-shrink-0 text-destructive" />
        <div>
          <h2 className="font-semibold text-destructive">
            Error Loading Receipt
          </h2>
          <p className="text-destructive/90">{message}</p>
        </div>
      </div>
    </div>
  );
};
