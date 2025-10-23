import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, Eye, EyeOff, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

interface OAuthCredentialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  provider: 'google' | 'slack' | 'notion';
  providerName: string;
}

export const OAuthCredentialsDialog: React.FC<OAuthCredentialsDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  provider,
  providerName,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Pre-fill redirect URI based on environment
  React.useEffect(() => {
    if (isOpen && !redirectUri) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const providerPath = provider === 'google' ? 'googleDrive' : provider;
      setRedirectUri(`${apiBaseUrl}/api/auth/${providerPath}/callback`);
    }
  }, [isOpen, provider, redirectUri]);

  const handleSave = async () => {
    // Validation
    if (!clientId.trim()) {
      setError('Client ID is required');
      return;
    }
    if (!clientSecret.trim()) {
      setError('Client Secret is required');
      return;
    }
    if (!redirectUri.trim()) {
      setError('Redirect URI is required');
      return;
    }

    // Validate redirect URI format
    try {
      const url = new URL(redirectUri);
      if (import.meta.env.PROD && url.protocol !== 'https:') {
        setError('Redirect URI must use HTTPS in production');
        return;
      }
    } catch (e) {
      setError('Invalid Redirect URI format');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ApiClient.post('/api/oauth-credentials/save', {
        provider,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri.trim(),
      });

      // Success! Close dialog and trigger OAuth flow
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to save OAuth credentials:', err);
      setError(err.message || 'Failed to save credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setClientId('');
    setClientSecret('');
    setError(null);
    setShowSetupGuide(false);
    onClose();
  };

  const getSetupGuideUrl = () => {
    switch (provider) {
      case 'google':
        return 'https://console.cloud.google.com/apis/credentials';
      case 'slack':
        return 'https://api.slack.com/apps';
      case 'notion':
        return 'https://www.notion.so/my-integrations';
      default:
        return '#';
    }
  };

  const getSetupInstructions = () => {
    switch (provider) {
      case 'google':
        return {
          title: 'Google OAuth Setup',
          steps: [
            'Go to Google Cloud Console',
            'Create a new project or select existing one',
            'Enable Google Drive API',
            'Go to "Credentials" and create "OAuth 2.0 Client ID"',
            'Choose "Web application" as application type',
            'Add the redirect URI shown below to "Authorized redirect URIs"',
            'Copy your Client ID and Client Secret',
          ],
          scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ],
        };
      case 'slack':
        return {
          title: 'Slack OAuth Setup',
          steps: [
            'Go to Slack API Apps page',
            'Click "Create New App" → "From scratch"',
            'Give your app a name and select your workspace',
            'Go to "OAuth & Permissions"',
            'Add the redirect URI shown below to "Redirect URLs"',
            'Scroll down to "Scopes" and add the required Bot Token Scopes',
            'Copy your Client ID and Client Secret from "App Credentials"',
          ],
          scopes: [
            'channels:history',
            'channels:read',
            'files:read',
            'users:read',
            'team:read',
          ],
        };
      case 'notion':
        return {
          title: 'Notion OAuth Setup',
          steps: [
            'Go to Notion Integrations page',
            'Click "New integration"',
            'Give your integration a name',
            'Select the workspace you want to connect',
            'Under "Integration type", choose "Public"',
            'Add the redirect URI shown below',
            'Copy your Client ID and Client Secret (OAuth client credentials)',
          ],
          scopes: [
            'Read content',
            'Read comments',
            'Read user information',
          ],
        };
      default:
        return { title: '', steps: [], scopes: [] };
    }
  };

  const instructions = getSetupInstructions();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect {providerName}</DialogTitle>
          <DialogDescription>
            To connect your {providerName} account, you need to create your own OAuth app.
            This keeps your data secure and gives you full control.
          </DialogDescription>
        </DialogHeader>

        {/* Why This is Needed */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Why do I need to create my own OAuth app?</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              <li>Your data stays under your control</li>
              <li>No shared rate limits with other users</li>
              <li>Better security and privacy</li>
              <li>Free to create and use</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Setup Guide Toggle */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowSetupGuide(!showSetupGuide)}
          >
            <span>{showSetupGuide ? 'Hide' : 'Show'} Setup Instructions</span>
            <ExternalLink className="h-4 w-4" />
          </Button>

          {showSetupGuide && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="font-semibold">{instructions.title}</h4>
              <ol className="space-y-2 text-sm">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-semibold text-primary">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="pt-2">
                <p className="text-sm font-semibold mb-2">Required Scopes:</p>
                <div className="flex flex-wrap gap-2">
                  {instructions.scopes.map((scope, index) => (
                    <code key={index} className="text-xs bg-background px-2 py-1 rounded border">
                      {scope}
                    </code>
                  ))}
                </div>
              </div>

              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open(getSetupGuideUrl(), '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open {providerName} Developer Console
              </Button>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="client-id">
              Client ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="client-id"
              placeholder="Enter your OAuth Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your {providerName} OAuth app settings
            </p>
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <Label htmlFor="client-secret">
              Client Secret <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="client-secret"
                type={showSecret ? 'text' : 'password'}
                placeholder="Enter your OAuth Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              This will be encrypted and stored securely
            </p>
          </div>

          {/* Redirect URI */}
          <div className="space-y-2">
            <Label htmlFor="redirect-uri">
              Redirect URI <span className="text-red-500">*</span>
            </Label>
            <Input
              id="redirect-uri"
              placeholder="Redirect URI"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Add this exact URI to your {providerName} OAuth app's authorized redirect URIs
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save & Continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

