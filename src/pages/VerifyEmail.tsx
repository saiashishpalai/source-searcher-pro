'use client';

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';

const VerifyEmail = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('');
  
  const { verifyEmail } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Get email from location state
    if (location.state?.email) {
      setEmail(location.state.email);
    }

    // Check if there's a verification token in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      handleVerification(token);
    }
  }, [location]);

  const handleVerification = async (token: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await verifyEmail(token);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setIsVerified(true);
        // Redirect to connect sources after successful verification
        setTimeout(() => {
          window.location.href = '/connect-sources';
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Email verification failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Simulate resending verification email
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to resend verification email. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold text-foreground">Email Verified!</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your account has been successfully verified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  You can now access all features of Haven7. Redirecting you to connect your sources...
                </p>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => navigate('/connect-sources')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  Continue to Haven7
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Haven7 Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-white font-bold text-lg">H7</span>
            </div>
            <span className="text-2xl font-semibold text-foreground">Haven7</span>
          </div>
          <p className="text-muted-foreground">Verify your email address</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We've sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the verification link in your email to activate your account and start using Haven7.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={resendVerification}
                  disabled={isLoading}
                  className="text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'resend it'}
                </button>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={resendVerification}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            Verification link expires in 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
