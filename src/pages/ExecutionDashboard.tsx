import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  RefreshCw, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { JiraStatusBadge } from '@/components/jira/JiraStatusBadge';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DashboardData {
  prds: Array<{
    id: string;
    title: string;
    status: string;
    jira_project_key: string;
    updated_at: string;
    tickets: any[];
    stats: {
      total: number;
      published: number;
      todo: number;
      inProgress: number;
      qa: number;
      done: number;
      blocked: number;
      completion: number;
    };
  }>;
  summary: {
    total: number;
    todo: number;
    inProgress: number;
    qa: number;
    done: number;
    blocked: number;
  };
  jiraSiteUrl?: string;
}

export default function ExecutionDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedPrds, setExpandedPrds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const result = await ApiClient.getExecutionDashboard();
      setData(result);
      
      // Auto-expand the first PRD if available
      if (result.prds.length > 0 && expandedPrds.size === 0) {
        setExpandedPrds(new Set([result.prds[0].id]));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await ApiClient.syncAllExecution();
      await fetchData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const togglePrd = (id: string) => {
    const newExpanded = new Set(expandedPrds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPrds(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="pl-0 text-white/40 hover:text-white mb-2 h-auto hover:bg-transparent"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6 text-white/60" />
              Tracker
            </h1>
            <p className="text-sm text-white/60">
              Track progress across all active projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/updates')}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Weekly Updates
            </Button>
            <Button 
              onClick={handleSyncAll} 
              disabled={isSyncing}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync Jira Status'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Tickets" 
            value={data?.summary.total || 0} 
            icon={<Layers className="h-4 w-4 text-white/60" />}
          />
          <StatCard 
            title="In Progress" 
            value={data?.summary.inProgress || 0} 
            icon={<Clock className="h-4 w-4 text-blue-400" />}
            subtext={`${data?.summary.qa || 0} in QA`}
          />
          <StatCard 
            title="Done" 
            value={data?.summary.done || 0} 
            icon={<CheckCircle2 className="h-4 w-4 text-green-400" />}
            completion={data?.summary.total ? Math.round((data.summary.done / data.summary.total) * 100) : 0}
          />
          <StatCard 
            title="Blocked" 
            value={data?.summary.blocked || 0} 
            icon={<AlertCircle className="h-4 w-4 text-red-400" />}
            isWarning={data?.summary.blocked > 0}
          />
        </div>

        {/* PRD List */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white/80">Active Projects</h2>
          
          {data?.prds.length === 0 ? (
            <Card className="bg-white/[0.02] border-white/10 p-8 text-center">
              <p className="text-white/40">No active execution projects found.</p>
              <Button 
                variant="link" 
                className="text-white/60 hover:text-white mt-2"
                onClick={() => navigate('/hub')}
              >
                Go to PRD Studio
              </Button>
            </Card>
          ) : (
            data?.prds.map(prd => (
              <Card key={prd.id} className="bg-white/[0.02] border-white/10 transition-all hover:bg-white/[0.03]">
                <Collapsible 
                  open={expandedPrds.has(prd.id)} 
                  onOpenChange={() => togglePrd(prd.id)}
                >
                  <CardHeader className="py-4 px-6">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Expand + Title + Status */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-1 h-auto text-white/40 hover:text-white">
                            {expandedPrds.has(prd.id) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 
                              className="text-base font-medium text-white truncate hover:underline cursor-pointer"
                              onClick={() => navigate(`/prd/${prd.id}/execution`)}
                            >
                              {prd.title}
                            </h3>
                            <Badge variant="outline" className="text-xs border-white/10 text-white/40 bg-white/5">
                              {prd.jira_project_key || 'No Project'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                            <span>Last updated: {new Date(prd.updated_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{prd.stats.total} tickets</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress + Stats */}
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="flex flex-col items-end w-32">
                          <div className="flex justify-between w-full text-xs mb-1">
                            <span className="text-white/60">{prd.stats.completion}% Done</span>
                          </div>
                          <Progress value={prd.stats.completion} className="h-1.5 bg-white/10" />
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex flex-col items-center px-3 border-l border-white/5">
                            <span className="text-white font-medium">{prd.stats.inProgress}</span>
                            <span className="text-[10px] text-white/40 uppercase">In Prog</span>
                          </div>
                          <div className="flex flex-col items-center px-3 border-l border-white/5">
                            <span className="text-white font-medium">{prd.stats.blocked}</span>
                            <span className="text-[10px] text-white/40 uppercase">Blocked</span>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-white/40 hover:text-white ml-2"
                          onClick={() => navigate(`/prd/${prd.id}/execution`)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="px-0 pb-4 pt-0 border-t border-white/5">
                      <div className="bg-black/20">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-medium text-white/40 border-b border-white/5">
                          <div className="col-span-1">Type</div>
                          <div className="col-span-2">Key</div>
                          <div className="col-span-5">Summary</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-2">Assignee</div>
                        </div>
                        
                        {/* Ticket List */}
                        <div className="max-h-[400px] overflow-y-auto">
                          {prd.tickets.map((ticket: any) => (
                            <div 
                              key={ticket.id}
                              className="grid grid-cols-12 gap-4 px-6 py-3 text-sm border-b border-white/5 hover:bg-white/[0.02] items-center transition-colors"
                            >
                              <div className="col-span-1 flex items-center">
                                {ticket.issue_type === 'epic' ? (
                                  <Layers className="h-4 w-4 text-purple-400/70" />
                                ) : (
                                  <FileText className="h-4 w-4 text-blue-400/70" />
                                )}
                              </div>
                              <div className="col-span-2 font-mono text-xs text-white/60 flex items-center gap-1">
                                {ticket.jira_issue_key || '-'}
                                {ticket.jira_issue_key && (
                                  <a 
                                    href={`${data?.jiraSiteUrl || ''}/browse/${ticket.jira_issue_key}`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              <div className="col-span-5 truncate text-white/80" title={ticket.draft_summary}>
                                {ticket.draft_summary}
                              </div>
                              <div className="col-span-2">
                                <JiraStatusBadge 
                                  status={ticket.jira_status} 
                                  ticketStatus={ticket.status} 
                                  size="sm" 
                                />
                              </div>
                              <div className="col-span-2 flex items-center gap-2">
                                {ticket.jira_assignee_name ? (
                                  <>
                                    <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                                      {ticket.jira_assignee_name.charAt(0)}
                                    </div>
                                    <span className="truncate text-xs text-white/60">{ticket.jira_assignee_name}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-white/20 italic">Unassigned</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtext, completion, isWarning }: any) {
  return (
    <Card className={cn(
      "bg-white/[0.02] border-white/10",
      isWarning && "border-red-500/20 bg-red-500/[0.02]"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white/60">{title}</span>
          {icon}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className={cn(
              "text-3xl font-bold tracking-tight text-white",
              isWarning && "text-red-400"
            )}>
              {value}
            </span>
            {subtext && (
              <p className="text-xs text-white/40 mt-1">{subtext}</p>
            )}
          </div>
          {typeof completion === 'number' && (
            <div className="h-10 w-10 relative flex items-center justify-center">
              <svg className="transform -rotate-90 w-full h-full">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-white/5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={100}
                  strokeDashoffset={100 - completion}
                  className="text-green-500 transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-white/80">{completion}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

