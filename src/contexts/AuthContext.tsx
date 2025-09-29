import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (token: string, password: string) => Promise<{ success: boolean; message: string }>;
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
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('haven7_token');
        if (token) {
          // In a real app, you'd verify the token with your backend
          // For now, we'll simulate a user session
          const userData = localStorage.getItem('haven7_user');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('haven7_token');
        localStorage.removeItem('haven7_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // Simulate API call - in real app, this would be a backend call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data - in real app, this would come from your backend
      const mockUser: User = {
        id: '1',
        email,
        isVerified: true,
        createdAt: new Date().toISOString()
      };

      const token = 'mock_jwt_token_' + Date.now();
      
      localStorage.setItem('haven7_token', token);
      localStorage.setItem('haven7_user', JSON.stringify(mockUser));
      setUser(mockUser);
      
      return { success: true, message: 'Login successful' };
    } catch (error) {
      return { success: false, message: 'Login failed. Please check your credentials.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would:
      // 1. Hash the password with bcrypt
      // 2. Create user in database
      // 3. Send verification email
      // 4. Return success message
      
      return { success: true, message: 'Account created! Please check your email to verify your account.' };
    } catch (error) {
      return { success: false, message: 'Signup failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('haven7_token');
    localStorage.removeItem('haven7_user');
    setUser(null);
    // Use window.location for navigation to avoid router context issues
    window.location.href = '/login';
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // Simulate email verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (user) {
        const updatedUser = { ...user, isVerified: true };
        setUser(updatedUser);
        localStorage.setItem('haven7_user', JSON.stringify(updatedUser));
      }
      
      return { success: true, message: 'Email verified successfully!' };
    } catch (error) {
      return { success: false, message: 'Email verification failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // Simulate password reset email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Password reset email sent! Check your inbox.' };
    } catch (error) {
      return { success: false, message: 'Failed to send reset email. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // Simulate password update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
      return { success: false, message: 'Failed to update password. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    verifyEmail,
    resetPassword,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
