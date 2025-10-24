
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, ArrowLeft, RefreshCw, Sparkles, LogIn } from 'lucide-react';

const VerifyEmail = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const { resendVerificationEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get email from URL params
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if there's a verification token in the URL
    const token = searchParams.get('token');
    
    if (token) {
      handleVerification(token);
    }
  }, [searchParams]);

  const handleVerification = async (token: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Supabase handles email verification automatically via URL
      // No need to call a separate function
      setMessage({ type: 'success', text: 'Email verified successfully!' });
      setIsVerified(true);
      
      // Show success modal instead of immediate redirect
      setShowSuccessModal(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Email verification failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleContinueToApp = () => {
    navigate('/connected-sources');
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

  // Success Modal Component
  const SuccessModal = () => {
    if (!showSuccessModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-in-up">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              🎉 Email Verified!
            </h2>
            <p className="text-gray-300 text-sm">
              Your account has been successfully verified. You can now sign in to start using Haven7.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSignIn}
              className="w-full bg-gradient-to-r from-[#A855F7] via-purple-600 to-fuchsia-600 text-white rounded-xl py-3.5 font-semibold hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
            >
              <span className="inline-flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign In to Continue
              </span>
            </Button>
            
            <Button
              onClick={handleContinueToApp}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl py-3.5 font-medium transition-all duration-200"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Continue to App
              </span>
            </Button>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowSuccessModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  if (isVerified) {
    return (
      <>
        <div className="flex h-screen bg-black">
          {/* Left side - Content */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
            {/* Radial gradient overlay from center */}
            <div className="absolute inset-0 bg-gradient-radial from-[#1a0a2e]/40 via-black to-black pointer-events-none" />
            
            {/* Soft purple glow accents */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
              <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[128px]" />
            </div>

            <div className="w-full max-w-md relative z-20">
              {/* Back to Haven7 */}
              <div className="mb-8 animate-fade-in">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Haven7
                </Link>
              </div>

              {/* Success Content */}
              <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Email Verified!
                </h1>
                <p className="text-gray-400 text-base mb-8">
                  Your account has been successfully verified. You can now sign in to start using Haven7.
                </p>
                
                <Button
                  onClick={() => setShowSuccessModal(true)}
                  className="w-full bg-gradient-to-r from-[#A855F7] via-purple-600 to-fuchsia-600 text-white rounded-xl py-3.5 font-semibold hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In to Continue →
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - Visual */}
          <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
            {/* Background image - auth-bg-4 */}
            <img 
              src="/src/assets/auth-bg-4.jpg" 
              alt="Abstract purple gradient background" 
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            {/* Wide soft gradient blend from left */}
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />
            {/* Subtle vignette for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/30 z-10" />
          </div>
        </div>

        {/* Success Modal */}
        <SuccessModal />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left side - Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        {/* Radial gradient overlay from center */}
        <div className="absolute inset-0 bg-gradient-radial from-[#1a0a2e]/40 via-black to-black pointer-events-none" />
        
        {/* Soft purple glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[128px]" />
        </div>

        <div className="w-full max-w-md relative z-20">
          {/* Back to Haven7 */}
          <div className="mb-8 animate-fade-in">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              Back to Haven7
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Check Your Email
            </h1>
            <p className="text-gray-400 text-base">
              We've sent a verification link to <strong className="text-white">{email}</strong>
            </p>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border animate-fade-in-up ${
              message.type === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`} style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{message.text}</span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <p className="text-gray-400 text-sm mb-4">
              Click the verification link in your email to activate your account and start using Haven7.
            </p>
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={resendVerification}
                disabled={isLoading}
                className="text-[#A855F7] hover:text-purple-400 font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'resend it'}
              </button>
            </p>
          </div>

          {/* Resend Button */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <Button
              onClick={resendVerification}
              disabled={isLoading}
              className="w-full bg-white/5 border border-gray-800/50 text-white rounded-xl py-3.5 font-medium hover:bg-white/10 transition-all duration-200 mb-4"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </span>
              )}
            </Button>
          </div>

          {/* Back to Sign In */}
          <div className="animate-fade-in-up" style={{ animationDelay: '1.0s' }}>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>

          {/* Footer text */}
          <p className="text-xs text-gray-600 mt-8 text-center animate-fade-in" style={{ animationDelay: '1.2s' }}>
            Verification link expires in 24 hours
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Background image - auth-bg-4 */}
        <img 
          src="/src/assets/auth-bg-4.jpg" 
          alt="Abstract purple gradient background" 
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        {/* Wide soft gradient blend from left */}
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />
        {/* Subtle vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/30 z-10" />
      </div>
    </div>
  );
};

export default VerifyEmail;
