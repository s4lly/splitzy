import { SignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function SignInPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <SignIn routing="path" path="/auth/sign-in" fallbackRedirectUrl="/" />
      <div className="mt-4 text-center text-sm">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/auth/sign-up')}
          className="text-primary underline hover:no-underline"
        >
          Sign up
        </button>
      </div>
    </motion.div>
  );
}
