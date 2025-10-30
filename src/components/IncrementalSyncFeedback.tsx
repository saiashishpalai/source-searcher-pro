import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  Zap, 
  TrendingUp,
  FileText,
  MessageSquare,
  Database,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface IncrementalSyncStats {
  totalFiles?: number;
  totalPages?: number;
  totalConversations?: number;
  changedFiles?: number;
  changedPages?: number;
  activeConversations?: number;
  unchangedFiles?: number;
  unchangedPages?: number;
  unchangedConversations?: number;
  totalMessages?: number;
  isIncremental: boolean;
  efficiencyMessage: string;
}

interface IncrementalSyncFeedbackProps {
  sourceType: string;
  stats: IncrementalSyncStats;
  isVisible: boolean;
}

const IncrementalSyncFeedback: React.FC<IncrementalSyncFeedbackProps> = ({ 
  sourceType, 
  stats, 
  isVisible 
}) => {
  if (!isVisible || !stats) return null;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'google_drive':
        return <FileText className="w-4 h-4" />;
      case 'notion':
        return <Database className="w-4 h-4" />;
      case 'slack':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getSourceName = (type: string) => {
    switch (type) {
      case 'google_drive':
        return 'Google Drive';
      case 'notion':
        return 'Notion';
      case 'slack':
        return 'Slack';
      default:
        return type;
    }
  };

  const getEfficiencyColor = (isIncremental: boolean) => {
    if (isIncremental) {
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  const getEfficiencyIcon = (isIncremental: boolean) => {
    if (isIncremental) {
      return <Sparkles className="w-4 h-4" />;
    }
    return <Zap className="w-4 h-4" />;
  };

  const calculateEfficiencyPercentage = () => {
    if (sourceType === 'google_drive') {
      const total = stats.totalFiles || 0;
      const unchanged = stats.unchangedFiles || 0;
      return total > 0 ? Math.round((unchanged / total) * 100) : 0;
    } else if (sourceType === 'notion') {
      const total = stats.totalPages || 0;
      const unchanged = stats.unchangedPages || 0;
      return total > 0 ? Math.round((unchanged / total) * 100) : 0;
    } else if (sourceType === 'slack') {
      const total = stats.totalConversations || 0;
      const unchanged = stats.unchangedConversations || 0;
      return total > 0 ? Math.round((unchanged / total) * 100) : 0;
    }
    return 0;
  };

  const efficiencyPercentage = calculateEfficiencyPercentage();

  return (
    <div className="mt-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <div className="bg-muted/20 rounded-md p-2.5">
        {/* Efficiency Bar - Only for incremental with savings */}
        {stats.isIncremental && efficiencyPercentage > 0 && (
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Efficiency</span>
              <span className="font-semibold text-green-400">{efficiencyPercentage}%</span>
            </div>
            <div className="relative h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${efficiencyPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Compact Statistics Grid */}
        <div className="grid grid-cols-4 gap-1.5 text-xs">

          {sourceType === 'notion' && (
            <>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Pages</div>
                <div className="font-semibold">{stats.totalPages || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-green-500/10 rounded">
                <div className="text-green-400 text-[10px]">Changed</div>
                <div className="font-semibold text-green-400">{stats.changedPages || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Skipped</div>
                <div className="font-semibold">{stats.unchangedPages || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-blue-500/10 rounded">
                <div className="text-blue-400 text-[10px]">Efficiency</div>
                <div className="font-semibold text-blue-400">{efficiencyPercentage}%</div>
              </div>
            </>
          )}

          {sourceType === 'slack' && (
            <>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Chats</div>
                <div className="font-semibold">{stats.totalConversations || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-green-500/10 rounded">
                <div className="text-green-400 text-[10px]">Active</div>
                <div className="font-semibold text-green-400">{stats.activeConversations || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Messages</div>
                <div className="font-semibold">{stats.totalMessages || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-blue-500/10 rounded">
                <div className="text-blue-400 text-[10px]">Efficiency</div>
                <div className="font-semibold text-blue-400">{efficiencyPercentage}%</div>
              </div>
            </>
          )}

          {sourceType === 'google_drive' && (
            <>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Files</div>
                <div className="font-semibold">{(stats.newFiles || 0) + (stats.updatedFiles || 0) + (stats.unchangedFiles || 0)}</div>
              </div>
              <div className="text-center p-1.5 bg-green-500/10 rounded">
                <div className="text-green-400 text-[10px]">Updated</div>
                <div className="font-semibold text-green-400">{stats.updatedFiles || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Unchanged</div>
                <div className="font-semibold">{stats.unchangedFiles || 0}</div>
              </div>
              <div className="text-center p-1.5 bg-blue-500/10 rounded">
                <div className="text-blue-400 text-[10px]">Efficiency</div>
                <div className="font-semibold text-blue-400">{efficiencyPercentage}%</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncrementalSyncFeedback;
