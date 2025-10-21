

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; message: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (email: string, password: string) => {
    try {
      console.log('🔍 Step 1: Checking if user exists for email:', email);
      
      // First, check if user already exists by calling a custom function
      // This bypasses RLS and checks the auth.users table directly
      const { data: userExists, error: checkError } = await supabase.rpc('check_user_exists', {
        user_email: email
      });

      console.log('🔍 Step 2: RPC check_user_exists result:', { userExists, checkError });

      // If there's an error calling the function, log it but continue
      if (checkError) {
        console.warn('⚠️ RPC function error (continuing anyway):', checkError);
      }

      // If user exists, return error message
      if (userExists === true) {
        console.log('❌ User already exists! Returning error message.');
        return {
          success: false,
          message: 'You already have an account! Please sign in instead.',
          isExistingUser: true,
        };
      }

      console.log('✅ User does not exist. Proceeding with signup...');

      // If we get here, user doesn't exist, proceed with signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      console.log('🔍 Step 3: SignUp result:', { data: data?.user?.id, error });

      if (error) {
        console.error('❌ SignUp error:', error);
        // Check if user already exists (fallback check)
        if (error.message.includes('already registered') || 
            error.message.includes('User already registered') ||
            error.message.includes('already been registered') ||
            error.message.includes('already exists')) {
          console.log('❌ Error indicates user already exists');
          return {
            success: false,
            message: 'You already have an account! Please sign in instead.',
            isExistingUser: true,
          };
        }
        throw error;
      }

      console.log('✅ Signup successful!');
      return {
        success: true,
        message: 'Account created! Please check your email to verify your account.',
      };
    } catch (error: any) {
      console.error('❌ Signup exception:', error);
      return {
        success: false,
        message: error.message || 'Failed to create account',
      };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Login successful!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Invalid email or password',
      };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // Redirect to login page after logout
    window.location.href = '/login';
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Password reset email sent! Check your inbox.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send reset email',
      };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Password updated successfully!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update password',
      };
    }
  };

  const resendVerificationEmail = async () => {
    try {
      if (!user?.email) {
        return {
          success: false,
          message: 'No email found',
        };
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Verification email sent!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to resend verification email',
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
