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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=slack_oauth_denied`)
    }

    if (!code || state !== 'slack_connect') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=invalid_oauth_state`)
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack/callback`
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData.error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=slack_token_exchange_failed`)
    }

    // Get user info from Slack
    const userResponse = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userData = await userResponse.json()

    if (!userData.ok) {
      console.error('Slack user info error:', userData.error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=slack_user_info_failed`)
    }

    // Store connection in database
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('user_sources')
        .upsert({
          user_id: userData.user.id, // This should be the Haven7 user ID
          source_type: 'slack',
          source_name: 'Slack',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          is_connected: true,
          connected_at: new Date().toISOString(),
          metadata: {
            team_id: tokenData.team?.id,
            team_name: tokenData.team?.name,
            user_id: userData.user.id,
            user_name: userData.user.name
          }
        })

      if (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=database_error`)
      }
    }

    // Redirect back to connect sources with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?success=slack_connected`)
  } catch (error) {
    console.error('Slack OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=oauth_callback_failed`)
  }
}
