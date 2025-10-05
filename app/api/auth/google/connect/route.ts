import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Google OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/api/auth/google/callback`
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Google OAuth not configured' },
        { status: 500 }
      )
    }

    // Generate secure state parameter
    const state = btoa(JSON.stringify({
      provider: 'google_drive',
      userId: user.id,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    }))

    // Google OAuth scopes for Drive API
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ')

    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.set('scope', scopes)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', state)

    // Redirect to Google OAuth
    return NextResponse.redirect(googleAuthUrl.toString())
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to initiate Google OAuth' },
      { status: 500 }
    )
  }
}
