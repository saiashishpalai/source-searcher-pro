import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Circle, Play, TestTube2, CheckCircle2, AlertOctagon, Clock } from 'lucide-react';

export type JiraStatus = 'To Do' | 'In Progress' | 'QA' | 'Done' | 'Blocked' | string;
export type TicketStatus = 'draft' | 'approved' | 'rejected' | 'published';

interface JiraStatusBadgeProps {
  status?: JiraStatus | null;
  ticketStatus?: TicketStatus;
  size?: 'sm' | 'md';
}

const jiraStatusConfig: Record<string, {
  icon: typeof Circle;
  className: string;
  label?: string;
}> = {
  'To Do': {
    icon: Circle,
    className: 'bg-white/5 text-white/60 border-white/10',
  },
  'In Progress': {
    icon: Play,
    className: 'bg-white/5 text-white/70 border-white/10',
  },
  'QA': {
    icon: TestTube2,
    className: 'bg-white/5 text-white/70 border-white/10',
    label: 'In QA',
  },
  'Done': {
    icon: CheckCircle2,
    className: 'bg-white/5 text-white/80 border-white/10',
  },
  'Blocked': {
    icon: AlertOctagon,
    className: 'bg-white/5 text-white/60 border-white/10',
  },
};

const ticketStatusConfig: Record<TicketStatus, {
  icon: typeof Circle;
  className: string;
  label: string;
}> = {
  draft: {
    icon: Clock,
    className: 'bg-white/5 text-white/60 border-white/10',
    label: 'Draft',
  },
  approved: {
    icon: CheckCircle2,
    className: 'bg-white/5 text-white/80 border-white/10',
    label: 'Approved',
  },
  rejected: {
    icon: AlertOctagon,
    className: 'bg-white/5 text-white/60 border-white/10',
    label: 'Rejected',
  },
  published: {
    icon: CheckCircle2,
    className: 'bg-white/5 text-white/80 border-white/10',
    label: 'Published',
  },
};

export function JiraStatusBadge({ status, ticketStatus, size = 'md' }: JiraStatusBadgeProps) {
  // If we have a Jira status, show that
  if (status) {
    const config = jiraStatusConfig[status] || {
      icon: Circle,
      className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };
    const Icon = config.icon;
    const label = config.label || status;

    return (
      <Badge 
        variant="outline" 
        className={cn(
          config.className,
          size === 'sm' && 'text-xs px-2 py-0.5'
        )}
      >
        <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        {label}
      </Badge>
    );
  }

  // Otherwise show ticket status
  if (ticketStatus) {
    const config = ticketStatusConfig[ticketStatus];
    const Icon = config.icon;

    return (
      <Badge 
        variant="outline" 
        className={cn(
          config.className,
          size === 'sm' && 'text-xs px-2 py-0.5'
        )}
      >
        <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        {config.label}
      </Badge>
    );
  }

  return null;
}

// Progress indicator for PRD execution
interface ExecutionProgressProps {
  progress: {
    total_tickets: number;
    published_tickets: number;
    jira_todo: number;
    jira_in_progress: number;
    jira_qa: number;
    jira_done: number;
    jira_blocked: number;
    completion_percentage: number;
  };
}

export function ExecutionProgress({ progress }: ExecutionProgressProps) {
  if (progress.published_tickets === 0) {
    return (
      <div className="text-sm text-white/60">
        No tickets published yet
      </div>
    );
  }

  const segments = [
    { count: progress.jira_done, color: 'bg-white/40', label: 'Done' },
    { count: progress.jira_qa, color: 'bg-white/30', label: 'QA' },
    { count: progress.jira_in_progress, color: 'bg-white/20', label: 'In Progress' },
    { count: progress.jira_blocked, color: 'bg-white/10', label: 'Blocked' },
    { count: progress.jira_todo, color: 'bg-white/5', label: 'To Do' },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">Progress</span>
        <span className="font-medium text-white/90">{progress.completion_percentage}% Complete</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/10">
        {segments.map((segment, idx) => (
          <div
            key={idx}
            className={cn('h-full', segment.color)}
            style={{ width: `${(segment.count / progress.published_tickets) * 100}%` }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', segment.color)} />
            <span className="text-white/60">{segment.label}: <span className="text-white/80 font-medium">{segment.count}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

