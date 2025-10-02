import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserConnections } from '@/lib/connections/get-connections';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔍 GET CONNECTIONS - Starting...', { url: request.url, timestamp: new Date().toISOString() });
  
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
    
    const supabase = createServiceClient();
    
    // Get user from session or use a test user ID
    const testUserId = '7bac32d5-50d6-4c7b-b595-be20f589233f';
    
    console.log('Using user ID:', testUserId);
    
    // Add overall timeout for the entire operation
    const connections = await Promise.race([
      getUserConnections(supabase, testUserId),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('GET connections timeout after 10 seconds')), 10000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    console.log('✅ GET CONNECTIONS completed:', { 
      count: connections.length, 
      duration: `${duration}ms`,
      connections: connections.map(c => ({ id: c.id, source_type: c.source_type, is_active: c.is_active }))
    });
    
    return NextResponse.json({ 
      connections,
      meta: {
        count: connections.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ GET connections error:', { 
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to get connections',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}