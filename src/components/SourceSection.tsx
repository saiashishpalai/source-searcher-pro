
import React from 'react';
import { ChevronDown, ChevronUp, MessageSquare, File, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ResultCard from './ResultCard';
import { SearchResult } from './SearchResults';

interface SourceSectionProps {
  source: string;
  results: SearchResult[];
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onResultClick?: (result: SearchResult) => void;
  onLinkVersions?: (newerDocId: string, olderDocId: string) => void;
  onDismissDuplicate?: (documentId: string, duplicateId: string) => void;
  animationDelay?: number;
}

const SourceSection: React.FC<SourceSectionProps> = ({
  source,
  results,
  isExpanded,
  onToggleExpansion,
  onResultClick,
  onLinkVersions,
  onDismissDuplicate,
  animationDelay = 0
}) => {
  // Helper function to normalize source names for display
  const normalizeSourceName = (source: string): string => {
    return source
      .replace(/_/g, ' ')  // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const displaySource = normalizeSourceName(source);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Slack':
        return <MessageSquare className="w-5 h-5" />;
      case 'Google Drive':
        return <File className="w-5 h-5" />;
      case 'Notion':
        return <FileText className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Slack':
        return {
          bg: 'bg-[#4A154B]/10',
          border: 'border-[#4A154B]/20',
          text: 'text-[#4A154B]',
          hover: 'hover:bg-[#4A154B]/15'
        };
      case 'Google Drive':
        return {
          bg: 'bg-[#4285F4]/10',
          border: 'border-[#4285F4]/20',
          text: 'text-[#4285F4]',
          hover: 'hover:bg-[#4285F4]/15'
        };
      case 'Notion':
        return {
          bg: 'bg-[#000000]/10',
          border: 'border-[#000000]/20',
          text: 'text-[#000000]',
          hover: 'hover:bg-[#000000]/15'
        };
      default:
        return {
          bg: 'bg-muted/10',
          border: 'border-muted/20',
          text: 'text-muted-foreground',
          hover: 'hover:bg-muted/15'
        };
    }
  };

  const colors = getSourceColor(displaySource);

  return (
    <div 
      className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg"
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Header */}
      <div 
        className={`
          flex items-center justify-between p-4 cursor-pointer
          ${colors.bg} ${colors.border} ${colors.hover}
          transition-all duration-200 ease-in-out
        `}
        onClick={onToggleExpansion}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
            <span className={colors.text}>
              {getSourceIcon(displaySource)}
            </span>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground">
              {displaySource}
            </h3>
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {Math.round(results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length * 100)}% avg relevance
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-background/20"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      <div 
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-4 space-y-4">
          {results.map((result, index) => (
            <ResultCard
              key={result.id}
              result={result}
              onClick={onResultClick}
              onLinkVersions={onLinkVersions}
              onDismissDuplicate={onDismissDuplicate}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default SourceSection;
