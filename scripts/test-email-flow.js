#!/usr/bin/env node

/**
 * Email Verification Flow Test Script
 * 
 * This script helps test the email verification flow without manual intervention
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailFlow() {
  console.log('🧪 Testing Email Verification Flow...\n');

  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log(`📧 Creating test user: ${testEmail}`);
    
    // Test signup
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:8081'}/verify-email`,
      },
    });

    if (error) {
      console.error('❌ Signup failed:', error.message);
      return;
    }

    console.log('✅ Test user created successfully');
    console.log(`🔗 Email redirect URL: ${process.env.VITE_APP_URL || 'http://localhost:8081'}/verify-email`);
    console.log(`📧 Check your email for verification link`);
    console.log(`🧪 Test email: ${testEmail}`);
    console.log(`🔑 Test password: ${testPassword}`);

    // Test verification URL construction
    const verificationUrl = `${process.env.VITE_APP_URL || 'http://localhost:8081'}/verify-email?token=test-token&email=${testEmail}`;
    console.log(`🔗 Test verification URL: ${verificationUrl}`);

    console.log('\n📝 Next Steps:');
    console.log('1. Check your email for the verification link');
    console.log('2. Click the link to test the redirect flow');
    console.log('3. Verify you\'re redirected to /connected-sources');
    console.log('4. Clean up the test user in Supabase dashboard if needed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEmailFlow();
