import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Upload, RefreshCw } from 'lucide-react';

interface BulkActionsBarProps {
  totalTickets: number;
  draftCount: number;
  approvedCount: number;
  publishedCount: number;
  onApproveAll: () => Promise<void>;
  onPublish: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  isApproving?: boolean;
  isPublishing?: boolean;
  isRegenerating?: boolean;
}

export function BulkActionsBar({
  totalTickets,
  draftCount,
  approvedCount,
  publishedCount,
  onApproveAll,
  onPublish,
  onRegenerate,
  isApproving,
  isPublishing,
  isRegenerating
}: BulkActionsBarProps) {
  const isProcessing = isApproving || isPublishing || isRegenerating;
  const canApproveAll = draftCount > 0 && !isProcessing;
  const canPublish = approvedCount > 0 && !isProcessing;
  const allPublished = publishedCount === totalTickets && totalTickets > 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/10">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-white/60">Total: </span>
          <span className="font-medium text-white/90">{totalTickets}</span>
        </div>
        {draftCount > 0 && (
          <div>
            <span className="text-white/60">Draft: </span>
            <span className="font-medium text-white/70">{draftCount}</span>
          </div>
        )}
        {approvedCount > 0 && (
          <div>
            <span className="text-white/60">Ready: </span>
            <span className="font-medium text-white/90">{approvedCount}</span>
          </div>
        )}
        {publishedCount > 0 && (
          <div>
            <span className="text-white/60">Published: </span>
            <span className="font-medium text-white/90">{publishedCount}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isProcessing || allPublished}
          className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Regenerate
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onApproveAll}
          disabled={!canApproveAll}
          className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Approve All ({draftCount})
        </Button>
        
        <Button
          size="sm"
          onClick={onPublish}
          disabled={!canPublish}
          className="bg-white/10 hover:bg-white/15 text-white border border-white/20"
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Publish to Jira ({approvedCount})
        </Button>
      </div>
    </div>
  );
}

