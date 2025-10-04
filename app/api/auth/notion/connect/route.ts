import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 NOTION CONNECT - Starting OAuth flow...');
    
    // Get environment variables
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/notion/callback`;
    
    console.log('Environment check:');
    console.log('- NOTION_CLIENT_ID exists:', !!clientId);
    console.log('- NOTION_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !redirectUri) {
      console.error('❌ Missing Notion OAuth environment variables');
      return NextResponse.json({ error: 'Notion OAuth not configured' }, { status: 500 });
    }

    // Notion OAuth parameters
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user',
      state: 'notion_connect' // State to prevent CSRF
    });

    const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
    
    console.log('✅ Redirecting to Notion OAuth:', notionAuthUrl);
    return NextResponse.redirect(notionAuthUrl);

  } catch (error) {
    console.error('❌ Notion connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate Notion OAuth' }, { status: 500 });
  }
}
