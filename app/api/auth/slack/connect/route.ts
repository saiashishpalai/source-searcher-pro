import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Slack OAuth configuration
    const clientId = process.env.SLACK_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack/callback`
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Slack OAuth not configured' },
        { status: 500 }
      )
    }

    // Slack OAuth scopes
    const scopes = [
      'channels:read',
      'groups:read',
      'im:read',
      'mpim:read',
      'users:read',
      'files:read',
      'search:read'
    ].join(',')

    // Build Slack OAuth URL
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
    slackAuthUrl.searchParams.set('client_id', clientId)
    slackAuthUrl.searchParams.set('scope', scopes)
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri)
    slackAuthUrl.searchParams.set('state', 'slack_connect') // Add CSRF protection

    // Redirect to Slack OAuth
    return NextResponse.redirect(slackAuthUrl.toString())
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    )
  }
}
