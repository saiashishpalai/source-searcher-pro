import { supabase } from '@/integrations/supabase/client';
import { ApiClient } from './api-client';

export async function refreshOAuthToken(integrationId: string) {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_refresh_token) {
      throw new Error('No refresh token available');
    }

    // Call your API to refresh the token
    const response = await fetch(`/api/integrations/${integrationId}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        refreshToken: session.provider_refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

// Token refresh API route handler
export async function handleTokenRefresh(provider: string, refreshToken: string) {
  try {
    let tokenResponse;

    switch (provider) {
      case 'google_drive':
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        break;

      case 'slack':
        tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.SLACK_CLIENT_ID!,
            client_secret: process.env.SLACK_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        break;

      case 'notion':
        // Notion doesn't support refresh tokens in the same way
        // You would need to re-authenticate
        throw new Error('Notion requires re-authentication');

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed for ${provider}`);
    }

    return await tokenResponse.json();
  } catch (error) {
    console.error(`Token refresh error for ${provider}:`, error);
    throw error;
  }
}
