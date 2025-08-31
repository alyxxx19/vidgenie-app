'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-xl font-mono text-white">auth_error</CardTitle>
          <CardDescription className="text-muted-foreground font-mono">
            authentication failed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            Something went wrong during the authentication process.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full bg-white hover:bg-white/90 text-black font-mono">
              <Link href="/auth/signin">
                try_again
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-white font-mono text-sm">
              <Link href="/">
                return_home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}