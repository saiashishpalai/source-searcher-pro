import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Notion OAuth configuration
    const clientId = process.env.NOTION_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/notion/callback`
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Notion OAuth not configured' },
        { status: 500 }
      )
    }

    // Notion OAuth scopes
    const scopes = [
      'read',
      'user:read'
    ].join(' ')

    // Build Notion OAuth URL
    const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize')
    notionAuthUrl.searchParams.set('client_id', clientId)
    notionAuthUrl.searchParams.set('redirect_uri', redirectUri)
    notionAuthUrl.searchParams.set('response_type', 'code')
    notionAuthUrl.searchParams.set('owner', 'user')
    notionAuthUrl.searchParams.set('state', 'notion_connect') // Add CSRF protection

    // Redirect to Notion OAuth
    return NextResponse.redirect(notionAuthUrl.toString())
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to initiate Notion OAuth' },
      { status: 500 }
    )
  }
}
