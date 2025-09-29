import bcrypt from 'bcryptjs';

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT token utilities (for future backend integration)
export const generateToken = (payload: any): string => {
  // In a real app, you'd use jsonwebtoken here
  // For now, we'll return a mock token
  return `mock_jwt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const verifyToken = (token: string): any => {
  // In a real app, you'd verify the JWT token here
  // For now, we'll return mock user data
  if (token.startsWith('mock_jwt_')) {
    return {
      id: '1',
      email: 'user@example.com',
      isVerified: true
    };
  }
  return null;
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
