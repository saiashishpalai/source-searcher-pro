
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import authBg8 from '@/assets/auth-bg-8.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setEmailSent(true);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex h-screen bg-black">
        {/* Left side - Form */}
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

            {/* Success State */}
            <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-[#A855F7] to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Check Your Email
              </h1>
              <p className="text-gray-400 text-base">
                We've sent a password reset link to <strong className="text-white">{email}</strong>
              </p>
            </div>

            <div className="bg-white/5 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-400">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <p className="text-xs text-gray-500">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setMessage(null);
                    }}
                    className="text-[#A855F7] hover:text-purple-400 font-medium transition-colors"
                  >
                    try again
                  </button>
                </p>
              </div>

              <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-[#A855F7] hover:text-purple-400 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Visual */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${authBg8})`
            }}
          />
          
          {/* Overlay for better text contrast */}
          <div className="absolute inset-0 bg-black/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left side - Form */}
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
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Forgot Password?
            </h1>
            <p className="text-gray-400 text-base">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/5 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm animate-fade-in ${
                message.type === 'error' 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                  : 'bg-green-500/10 border border-green-500/20 text-green-400'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {message.text}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <Label className="block text-sm text-gray-300 mb-2" htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 pr-4 bg-white/5 border border-gray-800/50 rounded-xl py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#A855F7] focus:bg-white/10 transition-all duration-200 placeholder:pl-0"
                    required
                  />
                </div>
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#A855F7] via-purple-600 to-fuchsia-600 text-white rounded-xl py-3.5 font-semibold hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </div>
            </form>

            <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '1.0s' }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-[#A855F7] hover:text-purple-400 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <p className="text-xs text-gray-600">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-[#A855F7] hover:text-purple-400 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${authBg8})`
          }}
        />
        
        {/* Overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
    </div>
  );
};

export default ForgotPassword;
