import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('=== GOOGLE DRIVE CALLBACK REACHED ===');
  console.log('🔄 GOOGLE DRIVE CALLBACK - Processing OAuth response...', {
    url: request.url,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  });
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    console.log('OAuth callback parameters:', {
      code: code ? `${code.substring(0, 10)}...` : null,
      error,
      state,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Check for OAuth errors
    if (error) {
      console.error('❌ OAuth error from Google:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=oauth_denied`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=no_code`);
    }
    
    // Handle mock authentication for development
    if (code === 'mock_auth_code') {
      console.log('🧪 MOCK AUTHENTICATION - Simulating successful Google Drive connection');
      
      // Save mock connection to database
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = createServiceClient();
      
      const testUserId = '7bac32d5-50d6-4c7b-b595-be20f589233f';
      
    // Use proper upsert for mock connection
    const { data: mockData, error: mockError } = await supabase
      .from('user_connections')
      .upsert({
        user_id: testUserId,
        source_type: 'google_drive',
        source_user_id: 'mock_user_123',
        workspace_id: 'mock_user_123', // Keep for backward compatibility
        workspace_name: 'Mock User', // Keep for backward compatibility
        access_token: 'mock_token_' + Date.now(),
        refresh_token: 'mock_refresh_' + Date.now(),
        is_active: true,
        metadata: {
          email: 'mock@example.com',
          name: 'Mock User'
        }
      }, {
        onConflict: 'user_id,source_type'
      })
      
      if (mockError) {
        console.error('❌ Error saving mock connection:', mockError);
      } else {
        console.log('✅ Mock connection saved successfully');
      }
      
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?success=drive`);
    }
    
    // Get environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    console.log('Environment check:');
    console.log('- GOOGLE_CLIENT_ID exists:', !!clientId);
    console.log('- GOOGLE_CLIENT_SECRET exists:', !!clientSecret);
    console.log('- GOOGLE_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing Google OAuth environment variables');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=config_missing`);
    }
    
    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', {
      success: tokenResponse.ok,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      error: tokenData.error
    });
    
    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=token_exchange_failed`);
    }
    
    // Get user info from Google
    console.log('👤 Fetching user info from Google...');
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    const userInfo = await userResponse.json();
    console.log('User info:', {
      success: userResponse.ok,
      email: userInfo.email,
      name: userInfo.name,
      id: userInfo.id
    });
    
    if (!userResponse.ok) {
      console.error('❌ Failed to get user info:', userInfo);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=user_info_failed`);
    }
    
    // Save real connection to database
    console.log('💾 Saving Google Drive connection to database...');
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();
    
    const testUserId = '7bac32d5-50d6-4c7b-b595-be20f589233f';
    
    // Use proper upsert with the correct schema
    const { data, error: saveError } = await supabase
      .from('user_connections')
      .upsert({
        user_id: testUserId,
        source_type: 'google_drive',
        source_user_id: userInfo.id,
        workspace_id: userInfo.id, // Keep for backward compatibility
        workspace_name: userInfo.name || userInfo.email, // Keep for backward compatibility
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        is_active: true,
        metadata: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      }, {
        onConflict: 'user_id,source_type'
      })
    
    if (saveError) {
      console.error('❌ Error saving connection:', saveError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=save_failed`);
    }
    
        const duration = Date.now() - startTime;
        console.log('✅ Google Drive OAuth completed and saved successfully', {
          duration: `${duration}ms`,
          userId: testUserId,
          sourceType: 'google_drive'
        });
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?success=drive`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error('❌ Google Drive callback error:', {
          error: error instanceof Error ? error.message : error,
          duration: `${duration}ms`,
          stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/connect-sources?error=callback_failed`);
      }
    }
