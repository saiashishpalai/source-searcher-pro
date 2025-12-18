import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Check, 
  X, 
  Edit2, 
  Save, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { JiraStatusBadge, type TicketStatus, type JiraStatus } from './JiraStatusBadge';

interface Ticket {
  id: string;
  jira_issue_key?: string;
  issue_type: 'epic' | 'story';
  draft_summary: string;
  draft_description?: string;
  draft_acceptance_criteria?: string;
  draft_priority: string;
  feature_area?: string;
  status: TicketStatus;
  jira_status?: JiraStatus;
  jira_assignee_name?: string;
  parent_ticket_id?: string;
  parent_jira_key?: string;
  sort_order: number;
  depth: number;
}

interface TicketDraftCardProps {
  ticket: Ticket;
  jiraSiteUrl?: string;
  onApprove: (ticketId: string) => Promise<void>;
  onReject: (ticketId: string) => Promise<void>;
  onUpdate: (ticketId: string, data: {
    summary?: string;
    description?: string;
    acceptanceCriteria?: string;
    priority?: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

export function TicketDraftCard({
  ticket,
  jiraSiteUrl,
  onApprove,
  onReject,
  onUpdate,
  isProcessing
}: TicketDraftCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    summary: ticket.draft_summary,
    description: ticket.draft_description || '',
    acceptanceCriteria: ticket.draft_acceptance_criteria || '',
    priority: ticket.draft_priority
  });
  const [isSaving, setIsSaving] = useState(false);

  const isEpic = ticket.issue_type === 'epic';
  const isPublished = ticket.status === 'published';
  const canEdit = ticket.status === 'draft' || ticket.status === 'approved';
  const canApprove = ticket.status === 'draft';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(ticket.id, editData);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    await onApprove(ticket.id);
  };

  const handleReject = async () => {
    await onReject(ticket.id);
  };

  return (
    <Card className={cn(
      'transition-all border-white/10 bg-white/[0.02] hover:bg-white/[0.04]',
      ticket.depth > 0 && 'ml-8 border-l-2 border-l-white/20',
      isEpic && 'border-white/15 bg-white/[0.03]',
      ticket.status === 'rejected' && 'opacity-60'
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="py-4 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-auto text-white/60 hover:text-white shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {isEpic ? (
                  <Badge variant="outline" className="bg-white/5 text-white/70 border-white/10 shrink-0">
                    <Layers className="h-3 w-3 mr-1" />
                    Epic
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-white/5 text-white/70 border-white/10 shrink-0">
                    <FileText className="h-3 w-3 mr-1" />
                    Story
                  </Badge>
                )}
                
                {ticket.jira_issue_key && (
                  <a
                    href={`${jiraSiteUrl}/browse/${ticket.jira_issue_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/50 hover:text-white/70 flex items-center gap-1 transition-colors shrink-0"
                  >
                    {ticket.jira_issue_key}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                
                {ticket.feature_area && (
                  <Badge variant="secondary" className="text-xs bg-white/5 text-white/60 border-white/10 shrink-0">
                    {ticket.feature_area}
                  </Badge>
                )}
                
                {isEditing ? (
                  <Input
                    value={editData.summary}
                    onChange={(e) => setEditData(d => ({ ...d, summary: e.target.value }))}
                    className="font-medium bg-white/5 border-white/10 text-white flex-1"
                  />
                ) : (
                  <h4 className="font-medium text-white/90 truncate flex-1">{ticket.draft_summary}</h4>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <JiraStatusBadge 
                status={ticket.jira_status} 
                ticketStatus={ticket.status}
                size="sm"
              />
              
              {canEdit && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isProcessing}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
              
              {canApprove && !isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))}
                    rows={4}
                    placeholder="Add implementation notes and context..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Acceptance Criteria</label>
                  <Textarea
                    value={editData.acceptanceCriteria}
                    onChange={(e) => setEditData(d => ({ ...d, acceptanceCriteria: e.target.value }))}
                    rows={6}
                    placeholder="Add testable acceptance criteria..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={editData.priority}
                    onValueChange={(value) => setEditData(d => ({ ...d, priority: value }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lowest">Lowest</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="highest">Highest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                {ticket.draft_description && (
                  <div>
                    <h5 className="text-sm font-medium text-white/60 mb-2">Description</h5>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{ticket.draft_description}</p>
                  </div>
                )}
                
                {ticket.draft_acceptance_criteria && (
                  <div>
                    <h5 className="text-sm font-medium text-white/60 mb-2">Acceptance Criteria</h5>
                    <div className="text-sm text-white/80 whitespace-pre-wrap bg-white/5 rounded-lg p-3 border border-white/10">
                      {ticket.draft_acceptance_criteria}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Priority: </span>
                    <span className="capitalize text-white/80">{ticket.draft_priority}</span>
                  </div>
                  {ticket.jira_assignee_name && (
                    <div>
                      <span className="text-white/60">Assignee: </span>
                      <span className="text-white/80">{ticket.jira_assignee_name}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

