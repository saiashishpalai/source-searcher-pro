
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  ExternalLink, 
  Shield, 
  Eye, 
  Lock, 
  X, 
  RefreshCw,
  Settings,
  Activity,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  Info,
  AlertCircle
} from 'lucide-react';
import { getEnvVar } from '@/lib/env';
import { ApiClient } from '@/lib/api-client';

// SVG Icon Components (reusing from existing components)
const SlackIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 122.8 122.8"
    className={className}
  >
    <path
      fill="#36C5F0"
      d="M30.3 77.7c0 5.6-4.6 10.2-10.2 10.2S10 83.3 10 77.7s4.6-10.2 10.2-10.2h10.1v10.2zm5.1 0c0-5.6 4.6-10.2 10.2-10.2s10.2 4.6 10.2 10.2v25.1c0 5.6-4.6 10.2-10.2 10.2s-10.2-4.6-10.2-10.2V77.7z"
    />
    <path
      fill="#2EB67D"
      d="M45.6 30.3c-5.6 0-10.2-4.6-10.2-10.2S40 10 45.6 10s10.2 4.6 10.2 10.2v10.1H45.6zm0 5.1c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2H20.5C14.9 55.8 10.3 51.2 10.3 45.6s4.6-10.2 10.2-10.2h25.1z"
    />
    <path
      fill="#ECB22E"
      d="M92.5 45.6c0-5.6 4.6-10.2 10.2-10.2s10.2 4.6 10.2 10.2-4.6 10.2-10.2 10.2H92.5V45.6zm-5.1 0c0 5.6-4.6 10.2-10.2 10.2s-10.2-4.6-10.2-10.2V20.5C67 14.9 71.6 10.3 77.2 10.3s10.2 4.6 10.2 10.2v25.1z"
    />
    <path
      fill="#E01E5A"
      d="M77.2 92.5c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2-10.2-4.6-10.2-10.2V92.5h10.2zm0-5.1c-5.6 0-10.2-4.6-10.2-10.2s4.6-10.2 10.2-10.2h25.1c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2H77.2z"
    />
  </svg>
);

const GoogleDriveIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 512 512"
    className={className}
  >
    <path
      fill="#4285F4"
      d="M160 32L0 320l96 160 160-288z"
    />
    <path
      fill="#FFBB00"
      d="M352 32h-192l160 288h192z"
    />
    <path
      fill="#34A853"
      d="M96 480h320l96-160H192z"
    />
  </svg>
);

const NotionIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.033-.793c1.635-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.747.934 1.213v16.378c0 1.026-.373 1.635-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.68-1.632z"
    />
  </svg>
);

// Connection Status Component
    const ConnectionStatus = ({ connection, onRefresh, onDisconnect, isRefreshing, onSyncDocuments, isSyncing, syncStatus, syncStatusLoading = false, syncError = null, setSyncError, onClearData }: {
      connection: any;
      onRefresh: () => void;
      onDisconnect: () => void;
      isRefreshing: boolean;
      onSyncDocuments?: () => void;
      isSyncing?: boolean;
      syncStatus?: any;
      syncStatusLoading?: boolean;
      syncError?: string | null;
      setSyncError?: (error: string | null) => void;
      onClearData?: () => void;
    }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <X className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatLastSync = (lastSync: string) => {
    if (!lastSync) return 'Never synced';
    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connection.status === 'healthy' ? 'bg-green-400' : connection.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
          <span className="text-sm font-medium text-foreground">
            {connection.status === 'healthy' ? 'Connected' : connection.status === 'warning' ? 'Limited Access' : 'Connection Issue'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 px-3"
        >
          {isRefreshing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* Connection Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Last Sync:</span>
          <p className="font-medium">{formatLastSync(connection.last_synced)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Items Indexed:</span>
          <p className="font-medium">{connection.indexed_items || 'Unknown'}</p>
        </div>
      </div>

      {/* Sync Progress */}
      {connection.sync_in_progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Syncing...</span>
            <span className="font-medium">{connection.sync_progress || 0}%</span>
          </div>
          <Progress value={connection.sync_progress || 0} className="h-2" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
          {/* Sync Documents Button for Google Drive */}
          {connection.source_type === 'google_drive' && onSyncDocuments && (
            <div className="space-y-2">
              <div className="space-y-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSyncDocuments}
                  disabled={isSyncing}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing... (0/5 docs)
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      {(syncStatus?.totalDocuments || 0) > 0 ? 'Re-sync Documents' : 'Sync Documents'}
                    </>
                  )}
                </Button>
                
                {(syncStatus?.totalDocuments || 0) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearData}
                    className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All Data
                  </Button>
                )}
              </div>
              
              {/* Sync Status Info - Fixed */}
              <div className="text-xs text-muted-foreground space-y-1">
                {isSyncing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      <span>Processing... ({syncStatus?.syncProgress?.processedDocuments || 0}/{syncStatus?.syncProgress?.totalDocuments || 5} docs)</span>
                    </div>
                    {syncStatus?.syncProgress?.currentDocument && (
                      <div className="text-center text-xs text-muted-foreground">
                        Current: {syncStatus.syncProgress.currentDocument}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {syncError ? (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start">
                          <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-red-800 font-medium">Sync Error</p>
                            <p className="text-sm text-red-700 mt-1">{syncError}</p>
        <div className="flex gap-2 mt-3">
          {syncError.includes('expired') && syncError.includes('session') ? (
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          ) : syncError.includes('expired') || syncError.includes('reconnect') ? (
            <button
              onClick={() => {
                setSyncError?.(null);
                window.location.href = '/connect-sources';
              }}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reconnect Google Drive
            </button>
          ) : (
            <button
              onClick={() => handleSyncDocuments?.()}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => setSyncError?.(null)}
            className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Documents:</span>
                          <span className="font-medium">{syncStatus?.totalDocuments ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chunks:</span>
                          <span className="font-medium">{syncStatus?.totalChunks ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Sync:</span>
                          <span className="font-medium">
                            {syncStatus?.lastSyncTime 
                              ? new Date(syncStatus.lastSyncTime).toLocaleString()
                              : 'Never'
                            }
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex-1"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="flex-1 text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
};

// Permission Modal Component (enhanced)
const PermissionModal = ({ 
  isOpen, 
  onClose, 
  source, 
  onConnect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  source: any; 
  onConnect: () => void; 
}) => {
  const getPermissionData = (sourceId: string) => {
    switch (sourceId) {
      case 'slack':
        return {
          willAccess: [
            'Read messages in channels you\'re in',
            'Read files shared in channels',
            'View channel names and team members',
            'Search message history',
            'Access public channel information'
          ],
          wontAccess: [
            'Cannot send messages on your behalf',
            'Cannot modify channels or settings',
            'Cannot access private DMs without permission',
            'Cannot invite or remove team members'
          ]
        };
      case 'googleDrive':
        return {
          willAccess: [
            'Read files and folders you can access',
            'View file metadata and structure',
            'Access shared drives you\'re part of',
            'Read document content for search',
            'View folder organization'
          ],
          wontAccess: [
            'Cannot modify or delete your files',
            'Cannot share files on your behalf',
            'Cannot create new files or folders',
            'Cannot change file permissions'
          ]
        };
      case 'notion':
        return {
          willAccess: [
            'Read pages you have access to',
            'View database content and structure',
            'Access page comments and discussions',
            'Read workspace content',
            'Search through your knowledge base'
          ],
          wontAccess: [
            'Cannot edit or delete your pages',
            'Cannot modify database structures',
            'Cannot create new pages or databases',
            'Cannot change workspace settings'
          ]
        };
      default:
        return { willAccess: [], wontAccess: [] };
    }
  };

  const permissionData = getPermissionData(source?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={`w-8 h-8 rounded-lg ${source?.color} flex items-center justify-center text-white`}>
              {source?.icon && React.createElement(source.icon, { className: "w-5 h-5" })}
            </div>
            Connect {source?.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review what Haven7 will access and how your data is used
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {/* What Haven7 will access */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              What Haven7 will access
            </h3>
            <ul className="space-y-2">
              {permissionData.willAccess.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Haven7 won't access */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              What Haven7 won't access
            </h3>
            <ul className="space-y-2">
              {permissionData.wontAccess.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How your data is used */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              How your data is used
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Your data is used only to answer your search queries</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>We use OAuth tokens securely encrypted in our database</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Your data is never shared with third parties or used for training AI models</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>You can disconnect anytime and we'll immediately revoke access</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConnect} className="bg-primary hover:bg-primary/90">
            Continue to {source?.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ConnectedSources = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingConnection, setRefreshingConnection] = useState<string | null>(null);
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [syncingDocuments, setSyncingDocuments] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    lastSyncTime: null,
    isSyncing: false
  });
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Mock data for demonstration - in real app this would come from API
  const availableSources = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Connect your Slack workspace to search messages, files, and conversations',
      icon: SlackIcon,
      color: 'bg-[#4A154B]',
      available: true,
      permissions: [
        'Channels you\'re in',
        'Messages and files',
        'Team member names'
      ]
    },
    {
      id: 'googleDrive',
      name: 'Google Drive',
      description: 'Access and search your Google Drive files, documents, and folders',
      icon: GoogleDriveIcon,
      color: 'bg-[#4285F4]',
      available: true,
      permissions: [
        'Files you can access',
        'Folder structure',
        'Document content'
      ]
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Search through your Notion pages, databases, and knowledge base',
      icon: NotionIcon,
      color: 'bg-[#000000]',
      available: true,
      permissions: [
        'Pages you have access to',
        'Database content',
        'Page comments'
      ]
    }
  ];

  // Fetch connections from API
  const fetchConnections = async () => {
    console.log('🔄 Fetching connections...');
    setIsLoading(true);
    
    try {
      const data = await ApiClient.get<{ connections: any[] }>('/api/connections/get');
      
      console.log('✅ Connections response:', data);
      
      if (data.connections) {
        // Enhance connection data with mock status info
        const enhancedConnections = data.connections.map((conn: any) => ({
          ...conn,
          status: Math.random() > 0.8 ? 'warning' : 'healthy', // Mock status
          indexed_items: Math.floor(Math.random() * 1000) + 100, // Mock indexed items
          sync_in_progress: Math.random() > 0.9, // Mock sync status
          sync_progress: Math.floor(Math.random() * 100), // Mock sync progress
        }));
        
        setConnections(enhancedConnections);
      } else {
        console.error('❌ No connections data received');
      }
    } catch (error) {
      console.error('❌ Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    // Only fetch sync status if user is authenticated
    if (session?.access_token) {
      fetchSyncStatus();
    }
  }, []);

  // Fetch sync status when user changes
  useEffect(() => {
    if (user && session?.access_token) {
      fetchSyncStatus();
    }
  }, [user, session]);

  const handleConnectClick = (source: any) => {
    setSelectedSource(source);
    setPermissionModalOpen(true);
  };

  const handleConnect = async (sourceId: string) => {
    setPermissionModalOpen(false);
    setConnectingSource(sourceId);
    
    try {
      // Build OAuth URLs - redirect to API server for callback
      const apiUrl = getEnvVar('VITE_API_URL') || 'http://localhost:3000';
      const redirectUri = `${apiUrl}/api/auth/${sourceId === 'googleDrive' ? 'google' : sourceId}/callback`;
      
      if (sourceId === 'googleDrive') {
        const clientId = getEnvVar('VITE_GOOGLE_CLIENT_ID');
        if (!clientId) {
          console.error('Google Client ID not configured');
          return;
        }
        
        // Create state parameter with userId
        const state = btoa(JSON.stringify({
          userId: user.id,
          timestamp: Date.now(),
          source: 'google'
        }));
        
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', clientId);
        googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');
        googleAuthUrl.searchParams.set('state', state);
        
        console.log('🔗 Redirecting to Google OAuth:', googleAuthUrl.toString());
        window.location.href = googleAuthUrl.toString();
        
      } else if (sourceId === 'slack') {
        const clientId = getEnvVar('VITE_SLACK_CLIENT_ID');
        if (!clientId) {
          console.error('Slack Client ID not configured');
          return;
        }
        
        // Create state parameter with userId
        const state = btoa(JSON.stringify({
          userId: user.id,
          timestamp: Date.now(),
          source: 'slack'
        }));
        
        const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
        slackAuthUrl.searchParams.set('client_id', clientId);
        slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
        slackAuthUrl.searchParams.set('scope', 'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,files:read,users:read,users:read.email,team:read');
        slackAuthUrl.searchParams.set('state', state);
        
        console.log('🔗 Redirecting to Slack OAuth:', slackAuthUrl.toString());
        window.location.href = slackAuthUrl.toString();
        
      } else if (sourceId === 'notion') {
        const clientId = getEnvVar('VITE_NOTION_CLIENT_ID');
        if (!clientId) {
          console.error('Notion Client ID not configured');
          return;
        }
        
        // Create state parameter with userId
        const state = btoa(JSON.stringify({
          userId: user.id,
          timestamp: Date.now(),
          source: 'notion'
        }));
        
        const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize');
        notionAuthUrl.searchParams.set('client_id', clientId);
        notionAuthUrl.searchParams.set('redirect_uri', redirectUri);
        notionAuthUrl.searchParams.set('response_type', 'code');
        notionAuthUrl.searchParams.set('owner', 'user');
        notionAuthUrl.searchParams.set('state', state);
        
        console.log('🔗 Redirecting to Notion OAuth:', notionAuthUrl.toString());
        window.location.href = notionAuthUrl.toString();
      }
    } catch (error) {
      console.error('OAuth connection error:', error);
      setConnectingSource(null);
    }
  };

  const handleDisconnect = async (sourceType: string) => {
    console.log(`🔌 Disconnecting ${sourceType}...`);
    setRefreshingConnection(sourceType);
    
    try {
      const response = await fetch('http://localhost:3000/api/connections/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ sourceType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Disconnect failed');
      }
      
      console.log('✅ Disconnected successfully');
      await fetchConnections();
      
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    } finally {
      setRefreshingConnection(null);
    }
  };

  const handleClearData = async () => {
    console.log('🗑️ Clearing all data...');
    
    try {
      const response = await fetch('http://localhost:3000/api/clear-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Clear data failed');
      }
      
      console.log('✅ Data cleared successfully');
      await fetchSyncStatus();
      await fetchConnections();
      
    } catch (error) {
      console.error('❌ Clear data error:', error);
    }
  };

  const handleRefreshConnection = async (sourceType: string) => {
    console.log('🔄 Refreshing connection:', sourceType);
    setRefreshingConnection(sourceType);
    
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshingConnection(null);
      fetchConnections();
    }, 2000);
  };

  const fetchSyncStatus = async () => {
    // Only fetch if user is authenticated
    if (!session?.access_token) {
      console.log('No session token available for sync status');
      return;
    }

    setSyncStatusLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/sync/status', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const status = await response.json();
        setSyncStatus(status);
      } else {
        console.log('Sync status response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      // Don't show error to user, just log it
    } finally {
      setSyncStatusLoading(false);
    }
  };

  const handleSyncDocuments = async () => {
    console.log('📄 Starting document sync...');
    console.log('🔑 Session token:', session?.access_token ? 'Present' : 'Missing');
    console.log('👤 User:', user?.id);
    setSyncingDocuments(true);
    setSyncError(null);
    
    if (!session?.access_token) {
      setSyncError('Your session has expired. Please refresh the page to log in again.');
      setSyncingDocuments(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3000/api/sync/google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'TOKEN_EXPIRED') {
          setSyncError('Your Google Drive connection has expired. Please reconnect Google Drive.');
          return;
        } else if (data.code === 'NOT_CONNECTED') {
          setSyncError('Google Drive is not connected. Please connect first.');
          return;
        }
        throw new Error(data.error || 'Sync failed');
      }
      
      console.log('✅ Sync complete:', data);
      
      // Refresh to show updated counts
      await fetchSyncStatus();
      await fetchConnections();
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncingDocuments(false);
    }
  };

  const getConnectedSources = () => {
    return availableSources.map(source => {
      const connection = connections.find(conn => 
        conn.source_type === (source.id === 'googleDrive' ? 'google_drive' : source.id)
      );
      return {
        ...source,
        connected: !!connection,
        connection
      };
    });
  };

  const connectedSources = getConnectedSources();
  const connectedCount = connectedSources.filter(s => s.connected).length;
  const totalItems = connections.reduce((sum, conn) => sum + (conn.indexed_items || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Connected Sources</h1>
                    <p className="text-sm text-muted-foreground">Manage your integrations</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{connectedCount}</p>
                      <p className="text-sm text-muted-foreground">Connected Sources</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{totalItems.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Items Indexed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        {connections.filter(c => c.status === 'healthy').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Healthy Connections</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sources Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connectedSources.map((source) => (
                <Card 
                  key={source.id}
                  className="bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-lg group h-full flex flex-col"
                >
                  <CardHeader className="pb-4 flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${source.color} flex items-center justify-center text-white`}>
                        {React.createElement(source.icon, { className: "w-6 h-6" })}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {source.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={source.connected ? "default" : "outline"} 
                            className={`text-xs ${
                              source.connected 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : ''
                            }`}
                          >
                            {source.connected ? 'Connected ✓' : 'Not connected'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <CardDescription className="text-sm text-muted-foreground mb-4">
                      {source.description}
                    </CardDescription>
                    
                    {source.connected ? (
        <ConnectionStatus
          connection={source.connection}
          onRefresh={() => handleRefreshConnection(source.id === 'googleDrive' ? 'google_drive' : source.id)}
          onDisconnect={() => handleDisconnect(source.id === 'googleDrive' ? 'google_drive' : source.id)}
          isRefreshing={refreshingConnection === (source.id === 'googleDrive' ? 'google_drive' : source.id)}
          onSyncDocuments={source.id === 'googleDrive' ? handleSyncDocuments : undefined}
          isSyncing={syncingDocuments}
          syncStatus={syncStatus}
          syncStatusLoading={syncStatusLoading}
          syncError={syncError}
          setSyncError={setSyncError}
          onClearData={handleClearData}
        />
                    ) : (
                      <div className="mt-auto space-y-3">
                        <Button 
                          variant="outline" 
                          className="w-full group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors h-10"
                          disabled={connectingSource === source.id}
                          onClick={() => handleConnectClick(source)}
                        >
                          {connectingSource === source.id ? (
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
                        
                        {/* Footer link */}
                        <button
                          onClick={() => handleConnectClick(source)}
                          className="w-full text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                        >
                          View permissions
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Features */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Bulk Actions */}
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Manage all your connections at once
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      connectedSources.filter(s => !s.connected).forEach(source => {
                        handleConnectClick(source);
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Connect All Available Sources
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={fetchConnections}
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh All Connections
                  </Button>
                </CardContent>
              </Card>

              {/* Help & Support */}
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Need Help?
                  </CardTitle>
                  <CardDescription>
                    Get support with your connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Having trouble connecting? Check our troubleshooting guide or contact support.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Documentation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        source={selectedSource}
        onConnect={() => handleConnect(selectedSource?.id)}
      />
    </div>
  );
};

export default ConnectedSources;
