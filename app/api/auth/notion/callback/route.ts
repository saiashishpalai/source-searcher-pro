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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=notion_oauth_denied`)
    }

    if (!code || state !== 'notion_connect') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=invalid_oauth_state`)
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/notion/callback`
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Notion OAuth error:', tokenData.error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=notion_token_exchange_failed`)
    }

    // Get user info from Notion
    const userResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Notion-Version': '2022-06-28'
      }
    })

    const userData = await userResponse.json()

    if (userData.object === 'error') {
      console.error('Notion user info error:', userData)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=notion_user_info_failed`)
    }

    // Store connection in database
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('user_sources')
        .upsert({
          user_id: userData.id, // This should be the Haven7 user ID
          source_type: 'notion',
          source_name: 'Notion',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          is_connected: true,
          connected_at: new Date().toISOString(),
          metadata: {
            user_id: userData.id,
            user_name: userData.name,
            user_email: userData.person?.email,
            avatar_url: userData.avatar_url
          }
        })

      if (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=database_error`)
      }
    }

    // Redirect back to connect sources with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?success=notion_connected`)
  } catch (error) {
    console.error('Notion OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-sources?error=oauth_callback_failed`)
  }
}
