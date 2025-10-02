import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 HEALTH CHECK - Basic API test');
    
    // Test basic functionality without database
    const timestamp = new Date().toISOString();
    const url = request.url;
    
    // Check environment variables exist (without exposing values)
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    };
    
    const missingEnvVars = Object.entries(envCheck)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);
    
    console.log('✅ Health check completed');
    console.log('Environment variables status:', envCheck);
    
    return NextResponse.json({
      status: 'ok',
      timestamp,
      url,
      environment: envCheck,
      missingEnvVars,
      message: missingEnvVars.length > 0 
        ? `Missing environment variables: ${missingEnvVars.join(', ')}` 
        : 'All environment variables present'
    });
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
