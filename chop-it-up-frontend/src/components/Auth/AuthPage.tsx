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
    <div className="flex flex-col h-[calc(100vh-58px)]">
      <div className="flex-1"></div>
      <div className="w-full max-w-md mx-auto mb-10">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Receipt className="h-6 w-6" />
            <h1 className="text-xl font-bold">Chop It Up</h1>
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