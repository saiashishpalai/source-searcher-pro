import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ApiClient } from '@/lib/api-client';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the provider from URL params
        const provider = searchParams.get('provider');
        
        // Supabase automatically handles the OAuth callback and sets the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('Failed to get session after OAuth');
        }

        // Now call your API to store the integration
        if (provider) {
          await ApiClient.post(`/api/auth/${provider}/callback`, {
            provider,
            // The session contains the OAuth tokens
            accessToken: session.provider_token,
            refreshToken: session.provider_refresh_token,
          });
        }

        setStatus('success');
        setMessage('Successfully connected! Redirecting...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          )}
          {status === 'success' && (
            <div className="text-green-600 text-5xl mb-4">✓</div>
          )}
          {status === 'error' && (
            <div className="text-red-600 text-5xl mb-4">✕</div>
          )}
          
          <h2 className="text-2xl font-bold mb-2">
            {status === 'loading' && 'Connecting...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </h2>
          
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
