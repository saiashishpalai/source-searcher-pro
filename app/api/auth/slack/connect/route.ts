import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 SLACK CONNECT - Starting OAuth flow...');
    
    // Get environment variables
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/slack/callback`;
    
    console.log('Environment check:');
    console.log('- SLACK_CLIENT_ID exists:', !!clientId);
    console.log('- SLACK_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !redirectUri) {
      console.error('❌ Missing Slack OAuth environment variables');
      return NextResponse.json({ error: 'Slack OAuth not configured' }, { status: 500 });
    }

    // Slack OAuth 2.0 parameters
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,files:read,users:read,users:read.email,team:read',
      redirect_uri: redirectUri,
      response_type: 'code',
      state: 'slack_connect' // State to prevent CSRF
    });

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    
    console.log('✅ Redirecting to Slack OAuth:', slackAuthUrl);
    return NextResponse.redirect(slackAuthUrl);

  } catch (error) {
    console.error('❌ Slack connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate Slack OAuth' }, { status: 500 });
  }
}