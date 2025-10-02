import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 MOCK NOTION - Simulating OAuth success...');
    
    // Simulate successful OAuth callback
    const mockCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/notion/callback?code=mock_notion_code&state=notion_connect`;
    
    console.log('✅ Redirecting to mock Notion callback:', mockCallbackUrl);
    
    return NextResponse.redirect(mockCallbackUrl);
    
  } catch (error) {
    console.error('❌ Mock Notion error:', error);
    return NextResponse.json({ error: 'Mock OAuth failed' }, { status: 500 });
  }
}
