import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): React.JSX.Element => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center min-h-[60vh]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
