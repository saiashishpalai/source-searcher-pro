import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 MOCK SLACK - Simulating OAuth success...');
    
    // Simulate successful OAuth callback
    const mockCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/slack/callback?code=mock_slack_code&state=slack_connect`;
    
    console.log('✅ Redirecting to mock Slack callback:', mockCallbackUrl);
    
    return NextResponse.redirect(mockCallbackUrl);
    
  } catch (error) {
    console.error('❌ Mock Slack error:', error);
    return NextResponse.json({ error: 'Mock OAuth failed' }, { status: 500 });
  }
}
