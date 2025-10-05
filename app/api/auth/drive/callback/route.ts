import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=google_oauth_denied`)
    }

    if (!code || state !== 'google_drive_connect') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=invalid_oauth_state`)
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
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/drive/callback`
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Google OAuth error:', tokenData.error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=google_token_exchange_failed`)
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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=google_user_info_failed`)
    }

    // Store connection in database
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=unauthorized`)
    }
    
    const { error: dbError } = await supabase
      .from('user_connections')
      .upsert({
        user_id: user.id,
        source_type: 'google_drive',
        source_user_id: userData.id,
        workspace_id: userData.id,
        workspace_name: 'Google Drive',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        is_active: true,
        metadata: {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          picture: userData.picture
        }
      }, {
        onConflict: 'user_id,source_type'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=database_error`)
    }

    // Redirect back to connect sources with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?success=google_drive`)
  } catch (error) {
    console.error('Google Drive OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/connect-sources?error=oauth_callback_failed`)
  }
}