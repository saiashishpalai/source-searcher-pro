
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ApiClient } from '@/lib/api-client';

export type OAuthProvider = 'google' | 'slack' | 'notion';

interface UseOAuthIntegrationReturn {
  connect: (provider: OAuthProvider, scopes?: string) => Promise<void>;
  disconnect: (integrationId: string) => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

export const useOAuthIntegration = (): UseOAuthIntegrationReturn => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProviderScopes = (provider: OAuthProvider, customScopes?: string): string => {
    const defaultScopes = {
      google: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email',
      slack: 'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history',
      notion: 'read_content',
    };

    return customScopes || defaultScopes[provider];
  };

  const connect = async (provider: OAuthProvider, customScopes?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Use existing OAuth endpoints
      const oauthEndpoints = {
        google: '/api/auth/google/connect',
        slack: '/api/auth/slack/connect',
        notion: '/api/auth/notion/connect'
      };
      
      const endpoint = oauthEndpoints[provider];
      if (endpoint) {
        console.log('🔗 Redirecting to OAuth:', endpoint);
        window.location.href = endpoint;
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      console.error('OAuth connection error:', err);
      setIsConnecting(false);
    }
  };

  const disconnect = async (integrationId: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      await ApiClient.post('/api/integrations/disconnect', { integrationId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      console.error('Disconnect error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  return { connect, disconnect, isConnecting, error };
};
