import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  AlertTriangle,
  FileText,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { 
  GranularityToggle, 
  type GranularityMode,
  ClassificationBadge,
  type PRDClassification,
  ExecutionProgress,
  JiraProjectSelector
} from '@/components/jira';
import { TicketDraftCard } from '@/components/jira/TicketDraftCard';
import { BulkActionsBar } from '@/components/jira/BulkActionsBar';

interface PRDData {
  id: string;
  title: string;
  status: string;
  classification: PRDClassification | null;
  granularity_mode: GranularityMode;
  jira_project_key: string | null;
  locked_at: string | null;
}

interface Ticket {
  id: string;
  jira_issue_key?: string;
  issue_type: 'epic' | 'story';
  draft_summary: string;
  draft_description?: string;
  draft_acceptance_criteria?: string;
  draft_priority: string;
  feature_area?: string;
  status: 'draft' | 'approved' | 'rejected' | 'published';
  jira_status?: string;
  jira_assignee_name?: string;
  parent_ticket_id?: string;
  parent_jira_key?: string;
  sort_order: number;
  depth: number;
}

interface Progress {
  total_tickets: number;
  published_tickets: number;
  draft_tickets: number;
  approved_tickets: number;
  rejected_tickets: number;
  jira_todo: number;
  jira_in_progress: number;
  jira_qa: number;
  jira_done: number;
  jira_blocked: number;
  completion_percentage: number;
}

export default function PRDExecution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [prd, setPrd] = useState<PRDData | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [jiraConnection, setJiraConnection] = useState<{
    connected: boolean;
    siteUrl?: string;
    defaultProject?: { key: string; name: string } | null;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(null);
  
  const [granularityMode, setGranularityMode] = useState<GranularityMode>('rolled_up');
  const [showSettings, setShowSettings] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load PRD and tickets
  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      
      // Load PRD data
      const { prd: prdData } = await ApiClient.getPRD(id);
      setPrd(prdData);
      setGranularityMode(prdData.granularity_mode || 'rolled_up');
      
      // Load Jira connection
      const connection = await ApiClient.getJiraConnection();
      setJiraConnection(connection);
      
      // Load tickets
      const { tickets: ticketData, progress: progressData } = await ApiClient.getPRDTickets(id);
      setTickets(ticketData || []);
      setProgress(progressData);
    } catch (error: any) {
      console.error('Failed to load PRD execution data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate tickets
  const handleGenerate = async () => {
    if (!id || !prd) return;
    
    try {
      setIsGenerating(true);
      
      // Classify first if needed
      let classification = prd.classification;
      if (!classification) {
        setIsClassifying(true);
        const classResult = await ApiClient.classifyPRD(id);
        classification = classResult.classification;
        setPrd(prev => prev ? { ...prev, classification } : null);
        setIsClassifying(false);
      }
      
      // Generate tickets
      const result = await ApiClient.generateDraftTickets(id, {
        granularityMode,
        classification: classification || undefined
      });
      
      toast({
        title: 'Tickets Generated',
        description: `Created ${result.tickets.length} draft tickets`
      });
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Failed to generate tickets:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate tickets',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
      setIsClassifying(false);
    }
  };

  // Approve all tickets
  const handleApproveAll = async () => {
    if (!id) return;
    
    try {
      setIsApproving(true);
      const result = await ApiClient.approveAllTickets(id);
      
      toast({
        title: 'Tickets Approved',
        description: `Approved ${result.approvedCount} tickets`
      });
      
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve tickets',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Publish to Jira
  const handlePublish = async () => {
    if (!id) return;
    
    try {
      setIsPublishing(true);
      setShowPublishConfirm(false);
      
      const result = await ApiClient.publishTicketsToJira(id);
      
      if (result.errors.length > 0) {
        toast({
          title: 'Partial Success',
          description: `Published ${result.published.length} tickets, ${result.errors.length} failed`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Published to Jira',
          description: `Successfully created ${result.published.length} tickets in Jira`
        });
      }
      
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Publish Failed',
        description: error.message || 'Failed to publish to Jira',
        variant: 'destructive'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Single ticket actions
  const handleApproveTicket = async (ticketId: string) => {
    if (!id) return;
    
    try {
      setProcessingTicketId(ticketId);
      await ApiClient.approveTicket(id, ticketId);
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingTicketId(null);
    }
  };

  const handleRejectTicket = async (ticketId: string) => {
    if (!id) return;
    
    try {
      setProcessingTicketId(ticketId);
      await ApiClient.rejectTicket(id, ticketId);
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingTicketId(null);
    }
  };

  const handleUpdateTicket = async (ticketId: string, data: {
    summary?: string;
    description?: string;
    acceptanceCriteria?: string;
    priority?: string;
  }) => {
    if (!id) return;
    
    try {
      setProcessingTicketId(ticketId);
      await ApiClient.updateDraftTicket(id, ticketId, data);
      await loadData();
      toast({
        title: 'Ticket Updated',
        description: 'Changes saved successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingTicketId(null);
    }
  };

  // Sync Jira status
  const handleSyncJira = async () => {
    if (!id) return;
    
    try {
      setIsSyncing(true);
      const result = await ApiClient.syncJiraStatus(id);
      
      toast({
        title: 'Sync Complete',
        description: `Updated ${result.synced} ticket${result.synced !== 1 ? 's' : ''} from Jira`
      });
      
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync with Jira',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Compute counts
  const draftCount = tickets.filter(t => t.status === 'draft').length;
  const approvedCount = tickets.filter(t => t.status === 'approved').length;
  const publishedCount = tickets.filter(t => t.status === 'published').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">PRD Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The PRD you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/prd')}>Go to PRD Hub</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!jiraConnection?.connected) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <img 
                src="https://cdn.worldvectorlogo.com/logos/jira-3.svg" 
                alt="Jira" 
                className="h-16 w-16 mx-auto mb-4" 
              />
              <h2 className="text-xl font-semibold mb-2">Connect Jira</h2>
              <p className="text-muted-foreground mb-4">
                Connect your Jira account to create tickets from this PRD.
              </p>
              <Button onClick={() => navigate('/settings')}>
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white/90">{prd.title}</h1>
                  <ClassificationBadge classification={prd.classification} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <FileText className="h-4 w-4" />
                  <Link to={`/prd/${prd.id}`} className="hover:text-white/80 transition-colors">
                    View PRD
                  </Link>
                  {prd.jira_project_key && (
                    <>
                      <span>•</span>
                      <span>Project: {prd.jira_project_key}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {publishedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncJira}
                  disabled={isSyncing}
                  className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Jira
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Settings Panel */}
        {showSettings && (
          <Card className="border-white/10 bg-white/[0.02]">
            <CardHeader>
              <CardTitle className="text-base text-white/90">Generation Settings</CardTitle>
              <CardDescription className="text-white/60">
                Configure how tickets are generated from this PRD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Granularity Mode</label>
                <GranularityToggle
                  value={granularityMode}
                  onChange={setGranularityMode}
                  disabled={publishedCount > 0}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Jira Project</label>
                <JiraProjectSelector
                  currentProject={
                    prd.jira_project_key 
                      ? { key: prd.jira_project_key, name: prd.jira_project_key }
                      : jiraConnection.defaultProject
                  }
                  compact
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress (if published) */}
        {progress && publishedCount > 0 && (
          <Card className="border-white/10 bg-white/[0.02]">
            <CardHeader>
              <CardTitle className="text-base text-white/90">Execution Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionProgress progress={progress} />
            </CardContent>
          </Card>
        )}

        {/* No tickets yet - Generate */}
        {tickets.length === 0 && (
          <Card className="border-dashed border-white/10 bg-white/[0.02]">
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white/90">Generate Jira Tickets</h3>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                AI will analyze your PRD and create draft tickets based on your settings. 
                You can review and edit them before publishing to Jira.
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="bg-white/10 hover:bg-white/15 text-white border border-white/20">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isClassifying ? 'Analyzing PRD...' : 'Generating Tickets...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Tickets
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tickets List */}
        {tickets.length > 0 && (
          <>
            <BulkActionsBar
              totalTickets={tickets.length}
              draftCount={draftCount}
              approvedCount={approvedCount}
              publishedCount={publishedCount}
              onApproveAll={handleApproveAll}
              onPublish={() => setShowPublishConfirm(true)}
              onRegenerate={handleGenerate}
              isApproving={isApproving}
              isPublishing={isPublishing}
              isRegenerating={isGenerating}
            />
            
            <div className="space-y-3">
              {tickets
                .filter(t => t.status !== 'rejected')
                .map((ticket) => (
                  <TicketDraftCard
                    key={ticket.id}
                    ticket={ticket}
                    jiraSiteUrl={jiraConnection.siteUrl}
                    onApprove={handleApproveTicket}
                    onReject={handleRejectTicket}
                    onUpdate={handleUpdateTicket}
                    isProcessing={processingTicketId === ticket.id}
                  />
                ))}
            </div>
            
            {/* Rejected tickets (collapsed) */}
            {tickets.some(t => t.status === 'rejected') && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Rejected ({tickets.filter(t => t.status === 'rejected').length})
                </h4>
                <div className="space-y-2 opacity-60">
                  {tickets
                    .filter(t => t.status === 'rejected')
                    .map((ticket) => (
                      <TicketDraftCard
                        key={ticket.id}
                        ticket={ticket}
                        jiraSiteUrl={jiraConnection.siteUrl}
                        onApprove={handleApproveTicket}
                        onReject={handleRejectTicket}
                        onUpdate={handleUpdateTicket}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to Jira?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {approvedCount} ticket{approvedCount !== 1 ? 's' : ''} in Jira 
              project <strong>{prd.jira_project_key || jiraConnection.defaultProject?.key}</strong>.
              <br /><br />
              The PRD will be locked after publishing to prevent untracked changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700">
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Publish to Jira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

