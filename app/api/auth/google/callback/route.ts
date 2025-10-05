import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=google_oauth_denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=invalid_oauth_state`)
    }

    // Validate state parameter
    let stateData: any;
    try {
      stateData = JSON.parse(atob(state));
      if (Date.now() - stateData.timestamp > 600000) {
        throw new Error('State expired');
      }
    } catch (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=invalid_state`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
      })
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=token_failed&message=${encodeURIComponent(error.error_description || error.error)}`
      );
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Google OAuth error:', tokenData.error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=google_token_exchange_failed`)
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userData = await userResponse.json()

    if (userData.error) {
      console.error('Google user info error:', userData.error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=google_user_info_failed`)
    }

    // Get authenticated Haven7 user
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User authentication error:', userError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=unauthorized`)
    }

    // Store connection in database using Haven7 user ID with service role
    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId, // Use Haven7 user ID from state
        source_type: 'google_drive',
        source_user_id: userData.id, // Store Google user ID in source_user_id
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        is_active: true,
        metadata: {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          picture: userData.picture
        }
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=database_error`)
    }

    // Redirect back to connect sources with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?success=google_connected`)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=oauth_callback_failed`)
  }
}
