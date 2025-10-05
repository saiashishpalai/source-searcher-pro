import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { handleTokenRefresh } from '@/lib/token-refresh';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { refreshToken } = await request.json();
    const integrationId = params.id;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the integration to determine provider
    const { data: integration, error: integrationError } = await supabase
      .from('user_connections')
      .select('source_type, access_token, refresh_token')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Refresh the token
    const refreshedTokens = await handleTokenRefresh(integration.source_type, refreshToken);

    // Update the integration with new tokens
    const { error: updateError } = await supabase
      .from('user_connections')
      .update({
        access_token: refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token || integration.refresh_token,
        token_expires_at: refreshedTokens.expires_at ? new Date(refreshedTokens.expires_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update integration:', updateError);
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token refresh failed' },
      { status: 500 }
    );
  }
}
