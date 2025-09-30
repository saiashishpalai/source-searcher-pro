import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    if (!code || state !== 'google_connect') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=invalid_oauth_state`)
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

    // Store connection in database
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('user_sources')
        .upsert({
          user_id: userData.id, // This should be the Haven7 user ID
          source_type: 'google_drive',
          source_name: 'Google Drive',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          is_connected: true,
          connected_at: new Date().toISOString(),
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
    }

    // Redirect back to connect sources with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?success=google_connected`)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=oauth_callback_failed`)
  }
}
