import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('=== NOTION CALLBACK REACHED ===');
  console.log('🔄 NOTION CALLBACK - Processing OAuth response...', {
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
      console.error('❌ OAuth error from Notion:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=oauth_denied`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=no_code`);
    }
    
    // Handle mock authentication for development
    if (code === 'mock_notion_code') {
      console.log('🧪 MOCK AUTHENTICATION - Simulating successful Notion connection');
      
      // Save mock connection to database
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = createServiceClient();
      
      const testUserId = '7bac32d5-50d6-4c7b-b595-be20f589233f';
      
      // Use proper upsert for mock connection
      const { data: mockData, error: mockError } = await supabase
        .from('user_connections')
        .upsert({
          user_id: testUserId,
          source_type: 'notion',
          source_user_id: 'mock_notion_user_123',
          workspace_id: 'mock_workspace_123',
          workspace_name: 'Mock Notion Workspace',
          access_token: 'notion_token_' + Date.now(),
          refresh_token: null, // Notion doesn't use refresh tokens
          is_active: true,
          metadata: {
            user_id: 'mock_user_123',
            user_name: 'Mock User',
            user_email: 'mock@example.com',
            workspace_name: 'Mock Notion Workspace'
          }
        }, {
          onConflict: 'user_id,source_type'
        });
        
      if (mockError) {
        console.error('❌ Error saving mock Notion connection:', mockError);
      } else {
        console.log('✅ Mock Notion connection saved successfully');
      }
      
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?success=notion`);
    }
    
    // Get environment variables
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/notion/callback`;
    
    console.log('Environment check:');
    console.log('- NOTION_CLIENT_ID exists:', !!clientId);
    console.log('- NOTION_CLIENT_SECRET exists:', !!clientSecret);
    console.log('- NOTION_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing Notion OAuth environment variables');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=config_missing`);
    }
    
    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', {
      success: tokenResponse.ok,
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error
    });
    
    if (!tokenResponse.ok || tokenData.error) {
      console.error('❌ Token exchange failed:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=token_exchange_failed`);
    }
    
    // Get user info from Notion
    console.log('👤 Fetching user info from Notion...');
    const userResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Notion-Version': '2022-06-28'
      },
    });
    
    const userInfo = await userResponse.json();
    console.log('User info:', {
      success: userResponse.ok && userInfo.object !== 'error',
      user_id: userInfo.id,
      user_name: userInfo.name,
      error: userInfo.error
    });
    
    if (!userResponse.ok || userInfo.object === 'error') {
      console.error('❌ Failed to get user info:', userInfo);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=user_info_failed`);
    }
    
    // Save Notion connection to database
    console.log('💾 Saving Notion connection to database...');
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();
    
    const testUserId = '7bac32d5-50d6-4c7b-b595-be20f589233f';
    
    // Use proper upsert with the correct schema
    const { data, error: saveError } = await supabase
      .from('user_connections')
      .upsert({
        user_id: testUserId,
        source_type: 'notion',
        source_user_id: userInfo.id,
        workspace_id: tokenData.workspace_id || userInfo.id,
        workspace_name: tokenData.workspace_name || userInfo.name || 'Notion Workspace',
        access_token: tokenData.access_token,
        refresh_token: null, // Notion doesn't use refresh tokens
        is_active: true,
        metadata: {
          user_id: userInfo.id,
          user_name: userInfo.name,
          user_email: userInfo.person?.email,
          avatar_url: userInfo.avatar_url,
          workspace_id: tokenData.workspace_id,
          workspace_name: tokenData.workspace_name,
          workspace_icon: tokenData.workspace_icon
        }
      }, {
        onConflict: 'user_id,source_type'
      });
    
    if (saveError) {
      console.error('❌ Error saving Notion connection:', saveError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=save_failed`);
    }
    
    const duration = Date.now() - startTime;
    console.log('✅ Notion OAuth completed and saved successfully', {
      duration: `${duration}ms`,
      userId: testUserId,
      sourceType: 'notion',
      workspaceId: tokenData.workspace_id,
      workspaceName: tokenData.workspace_name
    });
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?success=notion`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Notion callback error:', {
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=callback_failed`);
  }
}
