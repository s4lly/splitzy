import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { LogIn, Loader2 } from 'lucide-react';

const LoginForm = ({ onSuccess, onRegisterClick }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState(null);
  const { login, loading } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Simple validation
    if (!formData.username || !formData.password) {
      setFormError('Please fill in all fields');
      return;
    }

    const result = await login(formData);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <LogIn className="h-4 w-4" />
          Login
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && (
            <Alert variant="destructive" className="px-3 py-1 text-sm">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <Button
            type="submit"
            className="mt-2 h-9 w-full text-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="px-4 pb-3 pt-0">
        <div className="w-full text-center text-sm">
          Don't have an account?{' '}
          <Button
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={onRegisterClick}
            disabled={loading}
          >
            Sign up
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
