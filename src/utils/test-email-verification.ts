// Test utility for email verification flow
import { supabase } from '@/integrations/supabase/client';

export const testEmailVerification = {
  // Create a test user with a timestamp to avoid conflicts
  createTestUser: async () => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/verify-email`,
        },
      });
      
      if (error) throw error;
      
      console.log('🧪 Test user created:', testEmail);
      console.log('📧 Check your email for verification link');
      return { email: testEmail, password: testPassword };
    } catch (error) {
      console.error('❌ Test user creation failed:', error);
      throw error;
    }
  },

  // Clean up test user
  deleteTestUser: async (email: string) => {
    try {
      // Note: This requires admin privileges
      // In production, you'd need to use the service role key
      console.log('🧹 Test user cleanup:', email);
      console.log('⚠️ Manual cleanup required in Supabase dashboard');
    } catch (error) {
      console.error('❌ Test user cleanup failed:', error);
    }
  },

  // Simulate email verification (for development)
  simulateVerification: () => {
    const testUrl = `${window.location.origin}/verify-email?token=test-token&email=test@example.com`;
    console.log('🔗 Simulated verification URL:', testUrl);
    console.log('📝 Copy this URL to test the verification flow');
    return testUrl;
  }
};

// Development helper
export const devHelpers = {
  // Log current environment
  logEnvironment: () => {
    console.log('🌍 Environment Info:');
    console.log('- VITE_APP_URL:', import.meta.env.VITE_APP_URL);
    console.log('- window.location.origin:', window.location.origin);
    console.log('- Current URL:', window.location.href);
  },

  // Test redirect URL construction
  testRedirectUrl: () => {
    const redirectUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/verify-email`;
    console.log('🔗 Email redirect URL would be:', redirectUrl);
    return redirectUrl;
  }
};
