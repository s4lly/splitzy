import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

const ReceiptsPage = () => {
  return (
    <div className="px-1 py-8 sm:container">
      <SignedIn>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          TODO
        </motion.div>
      </SignedIn>

      <SignedOut>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-[60vh] items-center justify-center"
        >
          <Card className="w-full max-w-md border-2 border-dashed border-muted-foreground/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">
                Sign in to view receipts
              </CardTitle>
              <CardDescription>
                Create an account or sign in to see your receipt analysis
                history and manage your documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <SignInButton />
            </CardContent>
          </Card>
        </motion.div>
      </SignedOut>
    </div>
  );
};

export default ReceiptsPage;
