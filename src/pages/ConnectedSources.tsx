
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
import IncrementalSyncFeedback from '@/components/IncrementalSyncFeedback';
import DocumentLimitDialog from '@/components/DocumentLimitDialog';
import { toast } from '@/components/ui/sonner';

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
    const ConnectionStatus = ({ connection, onRefresh, onDisconnect, isRefreshing, onSyncDocuments, isSyncing, syncStatus, syncStatusLoading = false, syncError = null, setSyncError, onClearData, incrementalSyncResults, limitReached, limitInfo, onLimitDialogOpen }: {
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
      incrementalSyncResults?: any;
      limitReached?: boolean;
      limitInfo?: any;
      onLimitDialogOpen?: () => void;
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
    <div className="flex flex-col min-h-[310px]">
      {/* Status Overview */}
      <div className="flex items-center justify-between mb-3">
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

      {/* Document Limit Warning */}
      {limitReached && limitInfo && (
        <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Document Limit Reached
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                {limitInfo.message}
                {limitInfo.remainingFiles > 0 && (
                  <span className="block mt-1">
                    {limitInfo.remainingFiles} files were not processed due to the 200 document limit.
                  </span>
                )}
              </p>
              {onLimitDialogOpen && (
                <button
                  onClick={onLimitDialogOpen}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1"
                >
                  Learn more
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Progress */}
      {connection.sync_in_progress && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Syncing...</span>
            <div className="flex items-center gap-2">
              {(() => {
                const processed = (syncStatus?.[connection.source_type]?.filesProcessed) || (connection.processedDocuments) || 0;
                const percent = Math.min(100, Math.round((processed / 200) * 100)) || 0;
                return (
                  <>
                    <span className="font-medium">{percent}%</span>
                    <span className="text-xs text-muted-foreground">({processed}/200)</span>
                  </>
                );
              })()}
            </div>
          </div>
          {(() => {
            const processed = (syncStatus?.[connection.source_type]?.filesProcessed) || (connection.processedDocuments) || 0;
            const percent = Math.min(100, Math.round((processed / 200) * 100)) || 0;
            return <Progress value={percent} className="h-2" />;
          })()}
          
          {/* Limit warning when approaching limit */}
          {connection.processedDocuments && connection.processedDocuments >= 180 && (
            <div className="text-xs text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Approaching 200 document limit
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 mb-3">
          {/* Sync Documents Button for Google Drive, Notion, and Slack */}
          {(connection.source_type === 'google_drive' || connection.source_type === 'notion' || connection.source_type === 'slack') && onSyncDocuments && (
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
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    {(syncStatus?.[connection.source_type]?.totalDocuments || 0) > 0 ? 'Re-sync Documents' : 'Sync Documents'}
                  </>
                )}
              </Button>
              
              {(syncStatus?.[connection.source_type]?.totalDocuments || 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearData}
                  className="w-full text-xs text-red-600 hover:text-white hover:bg-red-600"
                >
                  Clear All Data
                </Button>
              )}
            </div>
          )}
      </div>

      {/* Stats Section */}
      <div className="flex-1 mb-3">
        {/* Sync Status Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          {!isSyncing && (
            <>
              {syncError ? (
                <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg shadow-sm animate-in fade-in-50 slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-red-100 rounded-full">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-red-900">Sync Issue</p>
                        <p className="text-sm text-red-700 mt-1 leading-relaxed">{syncError}</p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {syncError.includes('expired') && syncError.includes('session') ? (
                          <Button
                            onClick={() => window.location.reload()}
                            size="sm"
                            variant="default"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <RefreshCw className="w-3 h-3 mr-1.5" />
                            Refresh Page
                          </Button>
                        ) : syncError.includes('expired') || syncError.includes('reconnect') ? (
                          <Button
                            onClick={() => {
                              setSyncError?.(null);
                              window.location.href = '/connect-sources';
                            }}
                            size="sm"
                            variant="default"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Reconnect
                          </Button>
                        ) : (
                          <Button
                            onClick={() => onSyncDocuments?.()}
                            size="sm"
                            variant="default"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <RefreshCw className="w-3 h-3 mr-1.5" />
                            Try Again
                          </Button>
                        )}
                        <Button
                          onClick={() => setSyncError?.(null)}
                          size="sm"
                          variant="outline"
                          className="border-red-200 hover:bg-red-50"
                        >
                          <X className="w-3 h-3 mr-1.5" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>
                      {connection.source_type === 'slack' ? 'Message Chunks:' : 
                       connection.source_type === 'google_drive' ? 'Document Chunks:' :
                       connection.source_type === 'notion' ? 'Page Chunks:' : 'Chunks:'}
                    </span>
                    <span className="font-medium">{syncStatus?.[connection.source_type]?.totalChunks ?? 0}</span>
                  </div>
                  {connection.source_type === 'slack' && syncStatus?.[connection.source_type] && (
                    <>
                      {/* Show files synced if available */}
                      {(syncStatus[connection.source_type].filesProcessed !== undefined || syncStatus[connection.source_type].filesTotal !== undefined) && (
                        <div className="flex justify-between">
                          <span>Files Synced:</span>
                          <span className="font-medium">
                            {syncStatus[connection.source_type].filesProcessed ?? 0}
                            {syncStatus[connection.source_type].filesTotal ? ` / ${syncStatus[connection.source_type].filesTotal}` : ''}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {connection.source_type !== 'slack' && (
                    <>
                      <div className="flex justify-between">
                        <span>
                          {connection.source_type === 'google_drive' ? 'Files:' :
                           connection.source_type === 'notion' ? 'Pages:' : 'Documents:'}
                        </span>
                        <span className="font-medium">{syncStatus?.[connection.source_type]?.totalDocuments ?? 0}</span>
                      </div>
                      {connection.source_type === 'google_drive' && syncStatus?.[connection.source_type]?.totalDocuments > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Limit:</span>
                          <span className="font-medium">
                            {syncStatus[connection.source_type].totalDocuments}/200
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span className="font-medium">
                      {syncStatus?.[connection.source_type]?.lastSyncTime 
                        ? new Date(syncStatus[connection.source_type].lastSyncTime).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Incremental Sync Feedback - Now properly positioned */}
        {incrementalSyncResults && incrementalSyncResults[connection.source_type] && (
          <IncrementalSyncFeedback
            sourceType={connection.source_type}
            stats={incrementalSyncResults[connection.source_type]}
            isVisible={true}
          />
        )}
      </div>
        
      {/* Bottom Actions */}
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
          className="flex-1 text-destructive hover:text-white hover:bg-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
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
  const [syncingDocuments, setSyncingDocuments] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<Record<string, any>>({});
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncError, setSyncError] = useState<Record<string, string | null>>({});
  const [incrementalSyncResults, setIncrementalSyncResults] = useState<Record<string, any>>({});
  const [limitReached, setLimitReached] = useState<Record<string, boolean>>({});
  const [limitInfo, setLimitInfo] = useState<Record<string, any>>({});
  const [limitDialogOpen, setLimitDialogOpen] = useState<Record<string, boolean>>({});

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

  // Detect OAuth completion and show success message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    
    if (connected) {
      console.log('✅ OAuth success detected for:', connected);
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refetch connections to show the new connection
      fetchConnections();
      // Show success message
      alert(`✅ Successfully connected ${connected}!`);
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
    console.log('🚀 Starting OAuth connection for:', sourceId);
    setPermissionModalOpen(false);
    setConnectingSource(sourceId);
    
    try {
      // Build OAuth URLs - redirect to API server for callback
      // Use VITE_API_URL which can be set to ngrok URL for local dev with HTTPS
      const apiUrl = getEnvVar('VITE_API_URL') || 'https://source-searcher-pro.onrender.com';
      console.log('🔍 API URL:', apiUrl);
      console.log('🔍 Source ID:', sourceId);
      console.log('👤 User ID:', user?.id);
      const redirectUri = `${apiUrl}/api/auth/${sourceId === 'googleDrive' ? 'google' : sourceId}/callback`;
      
      if (sourceId === 'googleDrive') {
        // Redirect to backend OAuth endpoint - backend handles the OAuth flow
        const backendOAuthUrl = `${apiUrl}/api/auth/google?userId=${user?.id}`;
        console.log('🔗 Redirecting to backend Google OAuth:', backendOAuthUrl);
        console.log('🌐 About to redirect to:', backendOAuthUrl);
        window.location.href = backendOAuthUrl;
        
      } else if (sourceId === 'slack') {
        // Redirect to backend OAuth endpoint - backend handles the OAuth flow
        const backendOAuthUrl = `${apiUrl}/api/auth/slack?userId=${user?.id}`;
        console.log('🔗 Redirecting to backend Slack OAuth:', backendOAuthUrl);
        console.log('🌐 About to redirect to:', backendOAuthUrl);
        window.location.href = backendOAuthUrl;
        
      } else if (sourceId === 'notion') {
        // Redirect to backend OAuth endpoint - backend handles the OAuth flow
        const backendOAuthUrl = `${apiUrl}/api/auth/notion?userId=${user?.id}`;
        console.log('🔗 Redirecting to backend Notion OAuth:', backendOAuthUrl);
        console.log('🌐 About to redirect to:', backendOAuthUrl);
        window.location.href = backendOAuthUrl;
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
      const data = await ApiClient.post('/api/connections/disconnect', { sourceType });
      
      console.log('✅ Disconnected successfully');
      await fetchConnections();
      
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    } finally {
      setRefreshingConnection(null);
    }
  };

  const handleClearData = async (sourceType: string) => {
    console.log(`🗑️ Clearing data for ${sourceType}...`);
    
    try {
      const data = await ApiClient.post('/api/clear-data', { sourceType });
      
      const sourceName = sourceType === 'google_drive' ? 'Google Drive' : sourceType === 'notion' ? 'Notion' : sourceType;
      console.log(`✅ ${sourceName} data cleared successfully`);
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
      const status = await ApiClient.get('/api/sync/status');
      setSyncStatus(status);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      // Don't show error to user, just log it
    } finally {
      setSyncStatusLoading(false);
    }
  };

  const handleSyncDocuments = async (sourceType: string) => {
    console.log(`📄 Starting ${sourceType} document sync...`);
    console.log('🔑 Session token:', session?.access_token ? 'Present' : 'Missing');
    console.log('👤 User:', user?.id);
    
    // Set syncing state for this specific source
    setSyncingDocuments(prev => ({ ...prev, [sourceType]: true }));
    setSyncError(prev => ({ ...prev, [sourceType]: null }));
    setLimitReached(prev => ({ ...prev, [sourceType]: false }));
    
    if (!session?.access_token) {
      setSyncError(prev => ({ ...prev, [sourceType]: 'Your session has expired. Please refresh the page to log in again.' }));
      setSyncingDocuments(prev => ({ ...prev, [sourceType]: false }));
      return;
    }
    
    try {
      // Determine API endpoint based on source type
      const endpoint = sourceType === 'google_drive' 
        ? '/api/sync/google-drive'
        : sourceType === 'notion'
        ? '/api/sync/notion'
        : sourceType === 'slack'
        ? '/api/sync/slack'
        : null;
      
      if (!endpoint) {
        throw new Error(`Sync not implemented for ${sourceType}`);
      }
      
      const sourceName = sourceType === 'google_drive' ? 'Google Drive' 
        : sourceType === 'notion' ? 'Notion'
        : sourceType === 'slack' ? 'Slack'
        : sourceType;
      console.log(`🔄 Calling endpoint: ${endpoint}`);
      
      const data = await ApiClient.post(endpoint, {});
      
      if (data.code === 'TOKEN_EXPIRED') {
        setSyncError(prev => ({ ...prev, [sourceType]: `Your ${sourceName} connection has expired. Please reconnect ${sourceName}.` }));
        return;
      } else if (data.code === 'NOT_CONNECTED') {
        setSyncError(prev => ({ ...prev, [sourceType]: `${sourceName} is not connected. Please connect first.` }));
        return;
      }
      
      console.log('✅ Sync complete:', data);
      
      // Check if limit was reached
      if (data.limitReached) {
        setLimitReached(prev => ({ ...prev, [sourceType]: true }));
        setLimitInfo(prev => ({ 
          ...prev, 
          [sourceType]: {
            processedCount: data.processedDocuments,
            remainingFiles: data.remainingFiles || 0,
            message: data.message
          }
        }));
        
        // Show toast notification
        toast.warning("Document Limit Reached", {
          description: `Processed ${data.processedDocuments} of 200 documents. ${data.remainingFiles || 0} files will be processed in the next sync.`,
          duration: 5000,
        });
      } else {
        // Show success toast
        toast.success("Sync Complete", {
          description: `Successfully synced ${data.synced} documents from ${sourceName}`,
        });
      }
      
      if (data.synced === 0) {
        setSyncError(prev => ({ ...prev, [sourceType]: `No documents were synced from ${sourceName}. Make sure you have accessible content.` }));
      }
      
      // Store incremental sync results for UI feedback
      if (data.incrementalStats) {
        setIncrementalSyncResults(prev => ({
          ...prev,
          [sourceType]: {
            ...data.incrementalStats,
            timestamp: new Date().toISOString(),
            sourceName: sourceName
          }
        }));
      } else if (sourceType === 'google_drive') {
        // Build stats object from incremental sync response fields for Google Drive
        const processed = Number(data.processed || 0);
        const skipped = Number(data.skipped || 0);
        const updatedFiles = Number(data.updatedFiles || 0);
        const newFiles = Number(data.newFiles || 0);
        const unchangedFiles = Number(data.unchangedFiles || 0);
        const errors = Number(data.errors || 0);
        const totalCandidates = processed + skipped + errors || 0;
        const efficiency = totalCandidates > 0 ? Math.round((processed / totalCandidates) * 100) : 100;
        const totalFiles = newFiles + updatedFiles + unchangedFiles;

        setIncrementalSyncResults(prev => ({
          ...prev,
          [sourceType]: {
            processed,
            skipped,
            errors,
            newFiles,
            updatedFiles,
            unchangedFiles,
            totalFiles,
            totalCandidates,
            efficiency,
            isIncremental: (data.syncType === 'incremental'),
            totalDocuments: data.totalDocuments || 0,
            totalChunks: data.totalChunks || 0,
            timestamp: new Date().toISOString(),
            sourceName: sourceName
          }
        }));
      }
      
      // Store sync statistics for this source
      setSyncStatus(prev => ({
        ...prev,
        [sourceType]: {
          totalDocuments: data.totalDocuments || 0,
          totalChunks: data.totalChunks || 0,
          totalMessages: data.totalMessages || 0,
          filesProcessed: data.filesProcessed || 0,
          filesTotal: data.filesTotal || 0,
          statistics: data.statistics || null,
          lastSyncTime: new Date().toISOString(),
          isSyncing: false,
          details: data.details || []
        }
      }));
      
      // Refresh to show updated counts
      await fetchSyncStatus();
      await fetchConnections();
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      setSyncError(prev => ({ ...prev, [sourceType]: error instanceof Error ? error.message : 'Sync failed' }));
    } finally {
      setSyncingDocuments(prev => ({ ...prev, [sourceType]: false }));
    }
  };

  // Limit dialog handlers
  const handleLimitDialogOpen = (sourceType: string) => {
    setLimitDialogOpen(prev => ({ ...prev, [sourceType]: true }));
  };

  const handleLimitDialogClose = (sourceType: string) => {
    setLimitDialogOpen(prev => ({ ...prev, [sourceType]: false }));
  };

  const getConnectedSources = () => {
    return availableSources.map(source => {
      // Map frontend source IDs to database source_types
      const sourceTypeMap: Record<string, string> = {
        'googleDrive': 'google_drive',
        'notion': 'notion',
        'slack': 'slack'
      };
      const dbSourceType = sourceTypeMap[source.id] || source.id;
      
      const connection = connections.find(conn => 
        conn.source_type === dbSourceType
      );
      
      console.log(`🔍 Checking ${source.name}:`, {
        frontendId: source.id,
        dbSourceType,
        hasConnection: !!connection,
        connection: connection ? { id: connection.id, source_type: connection.source_type, is_active: connection.is_active } : null
      });
      
      return {
        ...source,
        connected: !!connection && connection.is_active,
        connection
      };
    });
  };

  const connectedSources = getConnectedSources();

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

        {/* Document Limits Info */}
        <div className="border-b border-border/30 bg-muted/20">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Document Limits</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Each source is limited to 200 documents per sync to ensure optimal performance. 
              Future syncs will process remaining files automatically.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">

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
          onRefresh={() => {
            const sourceTypeMap: Record<string, string> = { 'googleDrive': 'google_drive', 'notion': 'notion', 'slack': 'slack' };
            const dbSourceType = sourceTypeMap[source.id] || source.id;
            handleRefreshConnection(dbSourceType);
          }}
          onDisconnect={() => {
            const sourceTypeMap: Record<string, string> = { 'googleDrive': 'google_drive', 'notion': 'notion', 'slack': 'slack' };
            const dbSourceType = sourceTypeMap[source.id] || source.id;
            handleDisconnect(dbSourceType);
          }}
          isRefreshing={refreshingConnection === (source.id === 'googleDrive' ? 'google_drive' : source.id)}
          onSyncDocuments={(source.id === 'googleDrive' || source.id === 'notion' || source.id === 'slack') ? () => {
            const sourceTypeMap: Record<string, string> = { 'googleDrive': 'google_drive', 'notion': 'notion', 'slack': 'slack' };
            const dbSourceType = sourceTypeMap[source.id] || source.id;
            handleSyncDocuments(dbSourceType);
          } : undefined}
          isSyncing={syncingDocuments[source.id === 'googleDrive' ? 'google_drive' : source.id] || false}
          syncStatus={syncStatus}
          syncStatusLoading={syncStatusLoading}
          syncError={syncError[source.id === 'googleDrive' ? 'google_drive' : source.id] || null}
          setSyncError={(error: string | null) => setSyncError(prev => ({ ...prev, [source.id === 'googleDrive' ? 'google_drive' : source.id]: error }))}
          onClearData={() => {
            const sourceTypeMap: Record<string, string> = { 'googleDrive': 'google_drive', 'notion': 'notion', 'slack': 'slack' };
            const dbSourceType = sourceTypeMap[source.id] || source.id;
            handleClearData(dbSourceType);
          }}
          incrementalSyncResults={incrementalSyncResults}
          limitReached={limitReached[source.id === 'googleDrive' ? 'google_drive' : source.id] || false}
          limitInfo={limitInfo[source.id === 'googleDrive' ? 'google_drive' : source.id]}
          onLimitDialogOpen={() => {
            const sourceTypeMap: Record<string, string> = { 'googleDrive': 'google_drive', 'notion': 'notion', 'slack': 'slack' };
            const dbSourceType = sourceTypeMap[source.id] || source.id;
            handleLimitDialogOpen(dbSourceType);
          }}
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
            <div className="grid md:grid-cols-1 gap-6">
              {/* Commented out Quick Actions for user testing phase */}
              {/* 
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
              */}

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
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.open('mailto:saiashishpalai74@gmail.com?subject=Haven7%20Support%20Request', '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/docs')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Documentation
                    </Button>
                  </div>
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

      {/* Document Limit Dialogs */}
      {connectedSources.map((source) => {
        const sourceTypeMap: Record<string, string> = { 'googleDrive': 'google_drive', 'notion': 'notion', 'slack': 'slack' };
        const dbSourceType = sourceTypeMap[source.id] || source.id;
        
        return (
          <DocumentLimitDialog
            key={dbSourceType}
            isOpen={limitDialogOpen[dbSourceType] || false}
            onClose={() => handleLimitDialogClose(dbSourceType)}
            sourceType={dbSourceType}
            processedCount={limitInfo[dbSourceType]?.processedCount || 0}
            remainingFiles={limitInfo[dbSourceType]?.remainingFiles || 0}
          />
        );
      })}
    </div>
  );
};

export default ConnectedSources;
