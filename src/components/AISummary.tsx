
import React from 'react';
import { Sparkles, BarChart3, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AISummaryProps {
  summary: string;
  query: string;
  totalResults: number;
}

const AISummary: React.FC<AISummaryProps> = ({
  summary,
  query,
  totalResults
}) => {

  return (
    <div className="relative">
      {/* Glass-morphism background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-tr from-accent/8 via-transparent to-primary/5 rounded-2xl blur-2xl opacity-40" />
      
      {/* Main content container */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 lg:p-8 shadow-2xl">
        {/* Header with AI indicator */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-sm -z-10" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                AI Summary
                <Badge variant="secondary" className="text-xs">
                  Generated
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground">
                Key insights from your search across all sources
              </p>
            </div>
          </div>
          
          {/* Search stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span>{totalResults} results</span>
            </div>
          </div>
        </div>

        {/* Search query highlight */}
        <div className="mb-4 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Search query:</span>
          </div>
          <p className="text-foreground font-medium">"{query}"</p>
        </div>

        {/* AI Summary content */}
        <div className="space-y-4">
          <div className="prose prose-invert max-w-none">
            <p className="text-foreground/90 leading-relaxed text-base">
              {summary}
            </p>
          </div>
          
          {/* Interactive elements */}
          <div className="flex items-center gap-3 pt-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate Summary
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Export Summary
            </Button>
          </div>
        </div>

        {/* Subtle animated elements */}
        <div className="absolute top-4 right-4 opacity-20">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
        <div className="absolute bottom-4 left-4 opacity-15">
          <div className="w-1 h-1 bg-accent rounded-full animate-ping" />
        </div>
      </div>
    </div>
  );
};

export default AISummary;
