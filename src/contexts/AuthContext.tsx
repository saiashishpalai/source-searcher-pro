
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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

  // Check if we're using demo Supabase values
  const isDemoMode = supabase.supabaseUrl.includes('demo.supabase.co') || 
                     supabase.supabaseKey === 'demo-anon-key';

  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, skip Supabase auth and set loading to false
      setLoading(false);
      return;
    }

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
  }, [isDemoMode]);

  const signup = async (email: string, password: string) => {
    try {
      if (isDemoMode) {
        // Demo mode - simulate successful signup
        return {
          success: true,
          message: 'Demo account created! You can now login with any credentials.',
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Account created! Please check your email to verify your account.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create account',
      };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      if (isDemoMode) {
        // Demo mode - accept any email/password combination
        const mockUser: User = {
          id: '7bac32d5-50d6-4c7b-b595-be20f589233f',
          email: email,
          email_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmation_sent_at: null,
          recovery_sent_at: null,
          email_change_sent_at: null,
          new_email: null,
          new_phone: null,
          invited_at: null,
          action_link: null,
          email_change: null,
          phone_change: null,
          last_sign_in_at: new Date().toISOString(),
          phone: null,
          phone_confirmed_at: null,
          confirmed_at: new Date().toISOString(),
          email_change_confirm_status: 0,
          banned_until: null,
          is_anonymous: false,
          role: 'authenticated',
          factors: null,
          identities: []
        };

        const mockSession: Session = {
          access_token: 'demo-access-token',
          refresh_token: 'demo-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: mockUser
        };

        setUser(mockUser);
        setSession(mockSession);

        return {
          success: true,
          message: 'Demo login successful! (Using fallback authentication)',
        };
      }

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
    if (isDemoMode) {
      // Demo mode - just clear local state
      setUser(null);
      setSession(null);
    } else {
      await supabase.auth.signOut();
    }
    // Redirect to login page after logout
    window.location.href = '/login';
  };

  const resetPassword = async (email: string) => {
    try {
      if (isDemoMode) {
        return {
          success: true,
          message: 'Demo mode: Password reset email would be sent!',
        };
      }

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
      if (isDemoMode) {
        return {
          success: true,
          message: 'Demo mode: Password would be updated!',
        };
      }

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

      if (isDemoMode) {
        return {
          success: true,
          message: 'Demo mode: Verification email would be sent!',
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
