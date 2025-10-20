
import React from 'react';
import { ExternalLink, Calendar, User, MessageSquare, File, FileText, Table, Globe, ArrowUpRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchResult } from './SearchResults';
import DuplicateAlert from './DuplicateAlert';

interface ResultCardProps {
  result: SearchResult;
  onClick?: (result: SearchResult) => void;
  onLinkVersions?: (newerDocId: string, olderDocId: string) => void;
  onDismissDuplicate?: (documentId: string, duplicateId: string) => void;
  index?: number;
}

const ResultCard: React.FC<ResultCardProps> = ({ 
  result, 
  onClick, 
  onLinkVersions, 
  onDismissDuplicate, 
  index = 0 
}) => {
  // Helper function to normalize source names for display
  const normalizeSourceName = (source: string): string => {
    return source
      .replace(/_/g, ' ')  // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const displaySource = normalizeSourceName(result.source);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Slack':
        return <MessageSquare className="w-4 h-4" />;
      case 'Google Drive':
        return <File className="w-4 h-4" />;
      case 'Notion':
        return <FileText className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="w-4 h-4" />;
      case 'doc':
        return <FileText className="w-4 h-4" />;
      case 'excel':
        return <Table className="w-4 h-4" />;
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'page':
        return <Globe className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Slack':
        return 'text-[#4A154B] bg-[#4A154B]/10 border-[#4A154B]/20';
      case 'Google Drive':
        return 'text-[#4285F4] bg-[#4285F4]/10 border-[#4285F4]/20';
      case 'Notion':
        return 'text-[#000000] bg-[#000000]/10 border-[#000000]/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  };

  const handleClick = () => {
    onClick?.(result);
  };

  return (
    <div
      className={`
        group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5
        hover:bg-card/80 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5
        transition-all duration-300 ease-in-out cursor-pointer
        hover:scale-[1.02] hover:-translate-y-1
        animate-in fade-in-0 slide-in-from-bottom-2 duration-500
      `}
      style={{ 
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'both'
      }}
      onClick={handleClick}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Header with source and metadata */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="outline" 
            className={`text-xs font-medium ${getSourceColor(displaySource)}`}
          >
            <span className="mr-1">{getSourceIcon(displaySource)}</span>
            {displaySource}
          </Badge>
          
          <Badge 
            variant="outline" 
            className="text-xs"
          >
            <span className="mr-1">{getTypeIcon(result.type)}</span>
            {result.type}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={`text-xs ${getRelevanceColor(result.relevanceScore)}`}
          >
            {Math.round(result.relevanceScore * 100)}% match
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatTimestamp(result.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200 line-clamp-2">
        {result.title}
      </h3>

      {/* Content snippet */}
      <p className="text-sm text-muted-foreground/90 mb-3 line-clamp-3 leading-relaxed">
        {result.snippet}
      </p>

      {/* Duplicate Alert */}
      {onLinkVersions && onDismissDuplicate && (
        <div className="mb-3">
          <DuplicateAlert
            document={result}
            onLinkVersions={onLinkVersions}
            onDismiss={onDismissDuplicate}
          />
        </div>
      )}

      {/* Version indicator */}
      {result.has_older_versions && (result.alternate_versions_count ?? 0) > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="w-3 h-3" />
          <span>{result.alternate_versions_count} older version(s) available</span>
        </div>
      )}

      {/* Footer with author and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{result.author}</span>
          </div>
          
          {/* Additional metadata */}
          {result.channel && (
            <span className="text-[#4A154B] font-medium">#{result.channel}</span>
          )}
          {result.filename && (
            <span className="font-medium">{result.filename}</span>
          )}
          {result.page && (
            <span className="font-medium">📄 {result.page}</span>
          )}
        </div>
        
        {/* Action button */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          <ArrowUpRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 rounded-xl border-2 border-primary/0 group-hover:border-primary/20 transition-colors duration-300 pointer-events-none" />
    </div>
  );
};

export default ResultCard;
