import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { Receipt } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/');
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="flex h-[calc(100vh-58px)] flex-col">
      <div className="flex-1"></div>
      <div className="mx-auto mb-10 w-full max-w-md">
        <div className="mb-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Receipt className="h-6 w-6" />
            <h1 className="text-xl font-bold">Splitzy</h1>
          </div>
          <p className="text-sm text-muted-foreground">Receipt Analysis Tool</p>
        </div>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LoginForm
                onSuccess={handleAuthSuccess}
                onRegisterClick={toggleAuthMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <RegisterForm
                onSuccess={handleAuthSuccess}
                onLoginClick={toggleAuthMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1"></div>
    </div>
  );
};

export default AuthPage;
