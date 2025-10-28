
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, CheckCircle, Loader2, ArrowLeft, LogIn } from 'lucide-react';
import authBg7 from '@/assets/auth-bg-7.png';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // Redirect to main app
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.message });
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
              Sign In
            </h1>
            <p className="text-gray-400 text-base">
              Welcome back! Sign in to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Label className="block text-sm text-gray-300 mb-2" htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="pl-10 pr-4 bg-white/5 border border-gray-800/50 rounded-xl py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#A855F7] focus:bg-white/10 transition-all duration-200 placeholder:pl-0"
                  required
                />
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <Label className="block text-sm text-gray-300 mb-2" htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="pl-10 pr-12 bg-white/5 border border-gray-800/50 rounded-xl py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#A855F7] focus:bg-white/10 transition-all duration-200 placeholder:pl-0"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-700" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-[#A855F7] hover:text-purple-400">
                Forgot password?
              </Link>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '1.0s' }}>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#A855F7] via-purple-600 to-fuchsia-600 text-white rounded-xl py-3.5 font-semibold hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                disabled={isLoading}
              >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In →
                </span>
              )}
            </Button>
            </div>
          </form>

          {/* Sign up link */}
          <p className="text-center text-gray-400 mt-6 animate-fade-in" style={{ animationDelay: '1.2s' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#A855F7] hover:text-purple-400">
              Create one
            </Link>
          </p>

          {/* Footer text */}
          <p className="text-xs text-gray-600 mt-8 text-center animate-fade-in" style={{ animationDelay: '1.4s' }}>
            Secure authentication powered by Haven7
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${authBg7})`
          }}
        />
        
        {/* Overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
    </div>
  );
};

export default Login;
