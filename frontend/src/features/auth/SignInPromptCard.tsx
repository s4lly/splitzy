import { SignInButton } from '@clerk/clerk-react';
import { Trans } from '@lingui/react/macro';
import { LogIn } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
          <CardTitle className="text-xl">
            <Trans>Sign in to continue</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Create an account or sign in to see your receipt analysis history
              and manage your documents.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <SignInButton />
        </CardContent>
      </Card>
    </div>
  );
};
