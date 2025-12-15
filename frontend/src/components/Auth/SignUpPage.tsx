import { SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function SignUpPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <SignUp routing="path" path="/auth/sign-up" fallbackRedirectUrl="/" />
      <div className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/auth/sign-in')}
          className="text-primary underline hover:no-underline"
        >
          Sign in
        </button>
      </div>
    </motion.div>
  );
}
