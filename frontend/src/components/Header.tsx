import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react';
import { Receipt, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import receiptService from '../services/receiptService';
import { ThemeToggle } from './ThemeToggle';

export default function Header() {
  const [apiStatus, setApiStatus] = useState<
    'checking' | 'healthy' | 'unhealthy'
  >('checking');
  const { isAuthenticated, loading } = useAuth();

  // Check API health on component mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const isHealthy = await receiptService.checkHealth();
        setApiStatus(isHealthy ? 'healthy' : 'unhealthy');
      } catch (error) {
        setApiStatus('unhealthy');
      }
    };

    checkApiHealth();
  }, []);
  return (
    <header className="sticky top-0 z-10 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* ---- Header Content ---- */}

      <div className="flex h-14 items-center px-1 sm:container">
        <div className="mr-auto flex items-center gap-2 text-2xl font-bold">
          <Link to="/" className="flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Splitzy
          </Link>
        </div>

        {/* ---- API Health ---- */}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-sm">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span
              className={`h-2 w-2 rounded-full ${
                apiStatus === 'healthy'
                  ? 'bg-green-500'
                  : apiStatus === 'checking'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            <span className="hidden text-sm text-muted-foreground sm:inline-block">
              API {apiStatus}
            </span>
          </div>

          {/* ---- Auth ---- */}

          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>

          {/* ---- Theme Toggle ---- */}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
