import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 MOCK GOOGLE DRIVE - Simulating OAuth success...');
    
    // Simulate successful OAuth callback
    const mockCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/drive/callback?code=mock_auth_code&state=google_drive_connect`;
    
    console.log('✅ Redirecting to mock callback:', mockCallbackUrl);
    
    return NextResponse.redirect(mockCallbackUrl);
    
  } catch (error) {
    console.error('❌ Mock Google Drive error:', error);
    return NextResponse.json({ error: 'Mock OAuth failed' }, { status: 500 });
  }
}
