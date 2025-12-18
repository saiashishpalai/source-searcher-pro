import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ExternalLink, Unplug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JiraProjectSelector } from './JiraProjectSelector';

interface JiraConnectionStatus {
  connected: boolean;
  reason?: string;
  error?: string;
  siteUrl?: string;
  email?: string;
  displayName?: string;
  defaultProject?: { key: string; name: string } | null;
}

interface JiraConnectionCardProps {
  className?: string;
}

export function JiraConnectionCard({ className }: JiraConnectionCardProps) {
  const [status, setStatus] = useState<JiraConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const result = await ApiClient.getJiraConnection();
      setStatus(result);
    } catch (error) {
      console.error('Failed to check Jira connection:', error);
      setStatus({ connected: false, reason: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const jiraConnected = params.get('jira_connected');
    const jiraError = params.get('jira_error');

    if (jiraConnected === 'true') {
      toast({
        title: 'Jira Connected',
        description: 'Your Jira account has been successfully connected.',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    } else if (jiraError) {
      toast({
        title: 'Connection Failed',
        description: decodeURIComponent(jiraError),
        variant: 'destructive',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const { url } = await ApiClient.startJiraAuth();
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to start Jira auth:', error);
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to start Jira authentication',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await ApiClient.disconnectJira();
      setStatus({ connected: false });
      toast({
        title: 'Disconnected',
        description: 'Jira has been disconnected from your account.',
      });
    } catch (error: any) {
      console.error('Failed to disconnect Jira:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect Jira',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleProjectSelected = () => {
    checkConnection();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src="https://cdn.worldvectorlogo.com/logos/jira-3.svg" alt="Jira" className="w-6 h-6" />
            Jira
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0052CC] flex items-center justify-center text-white">
            <img src="https://cdn.worldvectorlogo.com/logos/jira-3.svg" alt="Jira" className="w-6 h-6 invert brightness-0" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                Jira
              </CardTitle>
              {status?.connected ? (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  Connected ✓
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">
                  Not connected
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              Connect to Jira Cloud to create and track tickets from your PRDs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col space-y-4">
        {status?.connected ? (
          <>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium">{status.displayName || status.email}</span>
              </div>
              {status.siteUrl && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Site</span>
                  <a 
                    href={status.siteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {new URL(status.siteUrl).hostname}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Default Project</span>
                <span className="font-medium">
                  {status.defaultProject ? (
                    <span className="text-blue-400">{status.defaultProject.key}</span>
                  ) : (
                    <span className="text-amber-400">Not Selected</span>
                  )}
                </span>
              </div>
            </div>

            <JiraProjectSelector 
              currentProject={status.defaultProject}
              onProjectSelected={handleProjectSelected}
            />

            <div className="pt-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unplug className="w-4 h-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 h-full">
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Jira account to automatically create tickets from your PRDs. 
              You'll be able to review and approve tickets before they're created.
            </p>
            <div className="mt-auto">
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
                variant="outline"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

