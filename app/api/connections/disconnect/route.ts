import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { disconnectSource } from '@/lib/connections/get-connections';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔌 DISCONNECT SOURCE - Starting...', { url: request.url, timestamp: new Date().toISOString() });
  
  try {
    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }
    
    console.log('✅ Environment variables present');
    
    const body = await request.json();
    const { sourceType } = body;
    
    if (!sourceType) {
      console.error('❌ Missing sourceType in request body');
      return NextResponse.json(
        { error: 'sourceType is required' },
        { status: 400 }
      );
    }
    
    console.log('Request body:', { sourceType });
    
    const supabase = createServiceClient();
    
    // Get user from session or use a test user ID
    const testUserId = '7bac32d5-50d6-4c7b-b595-be20f589233f';
    
    console.log('Using user ID:', testUserId);
    
    // Add overall timeout for the entire operation
    const result = await Promise.race([
      disconnectSource(supabase, testUserId, sourceType),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Disconnect timeout after 10 seconds')), 10000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    console.log('✅ DISCONNECT completed:', { 
      sourceType, 
      duration: `${duration}ms`,
      result: !!result
    });
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully disconnected ${sourceType}`,
      meta: {
        sourceType,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ DISCONNECT error:', { 
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect source',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}