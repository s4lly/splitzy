// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import receiptService from './services/receiptService';
import { Server, Loader2, Receipt } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import UserProfileDropdown from './components/Auth/UserProfileDropdown';
import LoginButton from './components/Auth/LoginButton';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import ReceiptAnalysisPage from './pages/ReceiptAnalysisPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient();

function App() {
  const [apiStatus, setApiStatus] = useState('checking');
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system">
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          {/* Header */}
        <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm">
          <div className="px-1 sm:container flex h-14 items-center">
            <div className="font-bold text-2xl mr-auto flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Splitzy
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-full shadow-sm border border-border">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className={`h-2 w-2 rounded-full ${
                  apiStatus === 'healthy' 
                    ? 'bg-green-500' 
                    : apiStatus === 'checking' 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                }`} />
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  API {apiStatus}
                </span>
              </div>
              
              {loading ? (
                <div className="h-8 w-8 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : isAuthenticated ? (
                <UserProfileDropdown />
              ) : (
                <LoginButton />
              )}
              
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full px-0 sm:container py-0">
          <Routes>
            <Route path="/auth" element={
              isAuthenticated ? <Navigate to="/" /> : <AuthPage />
            } />
            <Route path="/" element={
              <HomePage />
            } />
            <Route path="/receipt/:receiptId" element={
              <ReceiptAnalysisPage />
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="py-2 border-t border-border mt-auto bg-card/40">
          <div className="px-1 sm:container flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-1">
              <Receipt className="h-4 w-4" />
              <p className="text-xs font-medium">
                © {new Date().getFullYear()} Splitzy
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by Receipt AI
            </p>
          </div>
          </footer>
        </div>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
