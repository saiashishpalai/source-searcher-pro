import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 GOOGLE DRIVE CONNECT - Starting OAuth flow...');
    
    // Get environment variables (works for dev, staging, and production)
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/drive/callback`;
    
    console.log('Environment check:');
    console.log('- GOOGLE_CLIENT_ID exists:', !!clientId);
    console.log('- GOOGLE_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !redirectUri) {
      console.error('❌ Missing Google OAuth environment variables');
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Google OAuth 2.0 parameters
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      access_type: 'offline',
      prompt: 'consent',
      state: 'google_drive_connect'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('✅ Redirecting to Google OAuth:', authUrl);
    
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('❌ Google Drive connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google OAuth' }, { status: 500 });
  }
}
