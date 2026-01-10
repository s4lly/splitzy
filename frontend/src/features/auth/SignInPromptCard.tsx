import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SignInButton } from '@clerk/clerk-react';
import { LogIn } from 'lucide-react';

interface SignInPromptCardProps {
  className?: string;
}

export const SignInPromptCard = ({ className }: SignInPromptCardProps) => {
  return (
    <div
      className={cn('flex min-h-[60vh] items-center justify-center', className)}
    >
      <Card className="w-full max-w-md border-2 border-dashed border-muted-foreground/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Sign in to continue</CardTitle>
          <CardDescription>
            Create an account or sign in to see your receipt analysis history
            and manage your documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <SignInButton />
        </CardContent>
      </Card>
    </div>
  );
};
