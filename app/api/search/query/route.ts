import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const { query, userId } = await request.json()
    const startTime = Date.now()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      )
    }
    
    // Get user's connected sources from Supabase
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true)
    
    if (sourcesError) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch user sources' },
        { status: 500 }
      )
    }
    
    // TODO: Implement actual search across external sources
    // For now, return mock results based on connected sources
    const mockResults = sources?.map((source, index) => ({
      id: `${source.id}-${index}`,
      source: source.workspace_name || source.source_type,
      title: `Search result from ${source.workspace_name || source.source_type}`,
      content: `Found "${query}" in ${source.workspace_name || source.source_type}`,
      author: 'System',
      timestamp: new Date().toISOString(),
      url: `/${source.source_type.toLowerCase()}`
    })) || []
    
    // Save search query to history
    const responseTime = Date.now() - startTime
    await supabaseAdmin
      .from('search_queries')
      .insert({
        user_id: userId,
        query,
        results_count: mockResults.length,
        response_time: responseTime
      })
    
    return NextResponse.json({
      success: true,
      results: mockResults,
      totalCount: mockResults.length,
      responseTime
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Search failed' },
      { status: 500 }
    )
  }
}
