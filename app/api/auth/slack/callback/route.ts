import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('=== SLACK CALLBACK REACHED ===');
  console.log('🔄 SLACK CALLBACK - Processing OAuth response...', {
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
      console.error('❌ OAuth error from Slack:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=oauth_denied`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=no_code`);
    }
    
    // Handle mock authentication for development
    if (code === 'mock_slack_code') {
      console.log('🧪 MOCK AUTHENTICATION - Simulating successful Slack connection');
      
      // Save mock connection to database
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=unauthorized`);
      }
      
      // Use proper upsert for mock connection
      const { data: mockData, error: mockError } = await supabase
        .from('user_connections')
        .upsert({
          user_id: user.id,
          source_type: 'slack',
          source_user_id: 'mock_slack_user_123',
          workspace_id: 'mock_workspace_123',
          workspace_name: 'Mock Slack Workspace',
          access_token: 'xoxb-mock-token-' + Date.now(),
          refresh_token: null, // Slack doesn't use refresh tokens
          is_active: true,
          metadata: {
            team_id: 'mock_team_123',
            team_name: 'Mock Team',
            user_id: 'mock_user_123',
            scope: 'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,files:read,users:read,users:read.email,team:read'
          }
        }, {
          onConflict: 'user_id,source_type'
        });
        
      if (mockError) {
        console.error('❌ Error saving mock Slack connection:', mockError);
      } else {
        console.log('✅ Mock Slack connection saved successfully');
      }
      
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?success=slack`);
    }
    
    // Get environment variables
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/slack/callback`;
    
    console.log('Environment check:');
    console.log('- SLACK_CLIENT_ID exists:', !!clientId);
    console.log('- SLACK_CLIENT_SECRET exists:', !!clientSecret);
    console.log('- SLACK_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing Slack OAuth environment variables');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=config_missing`);
    }
    
    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', {
      success: tokenResponse.ok && tokenData.ok,
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error
    });
    
    if (!tokenResponse.ok || !tokenData.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=token_exchange_failed`);
    }
    
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    
    // Get team and user info from Slack
    console.log('👤 Fetching team info from Slack...');
    const teamResponse = await fetch('https://slack.com/api/team.info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const teamInfo = await teamResponse.json();
    console.log('Team info:', {
      success: teamResponse.ok && teamInfo.ok,
      team_id: teamInfo.team?.id,
      team_name: teamInfo.team?.name,
      error: teamInfo.error
    });
    
    // Get user info from Slack
    console.log('👤 Fetching user info from Slack...');
    const userResponse = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const userInfo = await userResponse.json();
    console.log('User info:', {
      success: userResponse.ok && userInfo.ok,
      user_id: userInfo.user?.id,
      user_name: userInfo.user?.name,
      team_id: userInfo.team?.id,
      error: userInfo.error
    });
    
    if (!teamResponse.ok || !teamInfo.ok || !userResponse.ok || !userInfo.ok) {
      console.error('❌ Failed to get Slack info:', { teamInfo, userInfo });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=slack_info_failed`);
    }
    
    // Save Slack connection to database
    console.log('💾 Saving Slack connection to database...');
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=unauthorized`);
    }
    
    // Use proper upsert with the correct schema
    const { data, error: saveError } = await supabase
      .from('user_connections')
      .upsert({
        user_id: user.id,
        source_type: 'slack',
        source_user_id: userInfo.user.id,
        workspace_id: teamInfo.team.id,
        workspace_name: teamInfo.team.name,
        access_token: accessToken,
        refresh_token: refreshToken,
        is_active: true,
        metadata: {
          team_id: teamInfo.team.id,
          team_name: teamInfo.team.name,
          team_domain: teamInfo.team.domain,
          user_id: userInfo.user.id,
          user_name: userInfo.user.name,
          user_email: userInfo.user.email,
          scope: 'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,files:read,users:read,users:read.email,team:read'
        }
      }, {
        onConflict: 'user_id,source_type'
      });
    
    if (saveError) {
      console.error('❌ Error saving Slack connection:', saveError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=save_failed`);
    }
    
    const duration = Date.now() - startTime;
    console.log('✅ Slack OAuth completed and saved successfully', {
      duration: `${duration}ms`,
      userId: user.id,
      sourceType: 'slack',
      teamId: teamInfo.team.id,
      teamName: teamInfo.team.name
    });
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?success=slack`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Slack callback error:', {
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=callback_failed`);
  }
}