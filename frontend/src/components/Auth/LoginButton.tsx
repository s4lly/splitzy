import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { LogIn } from 'lucide-react';

const LoginButton = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/auth');
  };

  return (
    <Button
      onClick={handleLoginClick}
      variant="outline"
      className="flex items-center gap-2"
    >
      <LogIn className="h-4 w-4" />
      <span>Login</span>
    </Button>
  );
};

export default LoginButton;
