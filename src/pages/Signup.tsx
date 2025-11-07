
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react';
import { debugRedirectUrl } from '@/utils/debug-redirect';
import authBg6 from '@/assets/auth-bg-6.png';
import ThemeToggle from '@/components/ThemeToggle';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; isExistingUser?: boolean } | null>(null);


  
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      setIsLoading(false);
      return;
    }

    try {
      const result = await signup(formData.email, formData.password);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // Redirect to email verification page or show success message
        setTimeout(() => {
          window.location.href = '/verify-email';
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message,
          isExistingUser: (result as any).isExistingUser 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="relative flex h-screen bg-background text-foreground dark:bg-black dark:text-white transition-colors">
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        {/* Radial gradient overlay from center */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent dark:from-[#1a0a2e]/40 dark:via-black dark:to-black pointer-events-none transition-colors" />
        
        {/* Soft purple glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 dark:bg-purple-600/20 rounded-full blur-[128px] transition-colors" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/25 dark:bg-fuchsia-600/15 rounded-full blur-[128px] transition-colors" />
        </div>

        <div className="w-full max-w-md relative z-20">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              Back to Haven7
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-accent/80 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Create your account
            </h1>
            <p className="text-muted-foreground text-base">
              Welcome! Please fill in the details to get started.
            </p>
          </div>

          {/* Google OAuth Button - Commented out for now */}
          {/* 
          <button
            type="button"
            onClick={() => console.log('Google sign-in coming soon')}
            className="w-full flex items-center justify-center gap-3 bg-white/95 backdrop-blur-sm text-gray-900 rounded-xl py-3.5 mb-6 hover:bg-white transition-all duration-200 shadow-lg shadow-white/10 hover:shadow-white/20 font-medium animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.9 16.1 19.1 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5.1l-6-4.9c-2 1.5-4.6 2.4-7 2.4-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 39.7 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.7-4.3 6.6-8.3 7.6l6 4.9C36.4 39.9 40 34.5 40 28c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-500">or</span>
            </div>
          </div>
          */}

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Label className="block text-sm text-muted-foreground dark:text-gray-300 mb-2" htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/80 dark:text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className="pl-10 pr-4 bg-card/80 dark:bg-white/5 border border-border/60 dark:border-gray-800/50 rounded-xl py-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500 focus:outline-none focus:border-[#A855F7] focus:bg-accent/10 dark:focus:bg-white/10 transition-all duration-200 placeholder:pl-0"
                  required
                />
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '1.0s' }}>
              <Label className="block text-sm text-muted-foreground dark:text-gray-300 mb-2" htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/80 dark:text-gray-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="pl-10 pr-12 bg-card/80 dark:bg-white/5 border border-border/60 dark:border-gray-800/50 rounded-xl py-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500 focus:outline-none focus:border-[#A855F7] focus:bg-accent/10 dark:focus:bg-white/10 transition-all duration-200 placeholder:pl-0"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters long</p>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
              <Label className="block text-sm text-muted-foreground dark:text-gray-300 mb-2" htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/80 dark:text-gray-500" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="pl-10 pr-12 bg-card/80 dark:bg-white/5 border border-border/60 dark:border-gray-800/50 rounded-xl py-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500 focus:outline-none focus:border-[#A855F7] focus:bg-accent/10 dark:focus:bg-white/10 transition-all duration-200 placeholder:pl-0"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div
                className={`p-4 rounded-lg border animate-fade-in-up ${
                  message.type === 'error'
                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/30'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-green-500/10 dark:text-green-200 dark:border-green-500/30'
                }`}
                style={{ animationDelay: '1.2s' }}
              >
                {message.isExistingUser ? (
                  <div className="space-y-3">
                    {/* Clean minimal header */}
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-700 dark:text-red-200">
                          Account already exists
                        </p>
                        <p className="text-xs text-red-600/80 dark:text-red-300/70 mt-1">
                          Please sign in to continue
                        </p>
                      </div>
                    </div>
                    
                    {/* Subtle action link */}
                    <div className="flex justify-end">
                      <Link 
                        to="/login" 
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign in instead
                      </Link>
                    </div>
                  </div>
                ) : (
                    <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      message.type === 'error' ? 'bg-red-500/10' : 'bg-green-500/10'
                    }`}>
                      {message.type === 'error' ? (
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground dark:text-gray-300">{message.text}</span>
                  </div>
                )}
              </div>
            )}

            <div className="animate-fade-in-up" style={{ animationDelay: '1.4s' }}>
              <Button
                type="submit"
                className={`w-full rounded-xl py-3.5 font-semibold transition-all duration-200 ${
                  message?.isExistingUser 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border/60 dark:bg-gray-600/50 dark:text-gray-400 dark:border-gray-700/50' 
                    : 'bg-gradient-to-r from-[#A855F7] via-purple-600 to-fuchsia-600 text-white hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                }`}
                disabled={isLoading || message?.isExistingUser}
              >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </span>
              ) : message?.isExistingUser ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Account Exists
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Continue →
                </span>
              )}
            </Button>
            </div>
          </form>

          {/* Sign in link - only show when no account exists error */}
          {!message?.isExistingUser && (
            <p className="text-center text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '1.6s' }}>
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80">
                Sign in
              </Link>
            </p>
          )}

          {/* Terms footer */}
          <p className="text-xs text-muted-foreground mt-8 text-center animate-fade-in" style={{ animationDelay: '1.8s' }}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${authBg6})`
          }}
        />
        
        {/* Overlay for better text contrast */}
        <div className="absolute inset-0 bg-white/60 dark:bg-black/20 transition-colors" />
      </div>
    </div>
  );
};

export default Signup;
