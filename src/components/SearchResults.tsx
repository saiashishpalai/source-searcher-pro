

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, RefreshCw, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AISummary from './AISummary';
import SourceSection from './SourceSection';
import ResultCard from './ResultCard';
import LoadingSkeleton from './LoadingSkeleton';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface SearchResult {
  id: string;
  document_id?: string;
  title: string;
  content: string;
  snippet: string;
  source: 'Slack' | 'Google Drive' | 'Notion';
  type: 'message' | 'pdf' | 'doc' | 'excel' | 'page';
  author: string;
  timestamp: string;
  relevanceScore: number;
  url?: string;
  channel?: string;
  filename?: string;
  page?: string;
  metadata?: Record<string, any>;
  // TF-IDF duplicate detection
  potential_duplicates?: Array<{
    document_id: string;
    title: string;
    source_type: string;
    similarity_score: string;
    synced_at: string;
  }>;
  // Version linking metadata
  has_older_versions?: boolean;
  alternate_versions_count?: number;
  version_group_id?: string;
  is_latest?: boolean;
}

export interface SearchResultsData {
  query: string;
  totalResults: number;
  results: SearchResult[];
  aiSummary: string;
  searchTime: number;
  timestamp: string;
}

interface SearchResultsProps {
  data: SearchResultsData;
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  summaryVersions?: string[];
  onRegenerateSummary?: () => void;
  isRegeneratingSummary?: boolean;
  canRegenerateSummary?: boolean;
  isClosedThread?: boolean;
  // Filter props from parent
  parentFilters?: {
    applications?: string[];
    documentTypes?: string[];
  };
}

const SearchResults: React.FC<SearchResultsProps> = ({
  data,
  isLoading = false,
  onResultClick,
  onRetry,
  onLoadMore,
  hasMore = false,
  summaryVersions,
  onRegenerateSummary,
  isRegeneratingSummary = false,
  canRegenerateSummary = true,
  isClosedThread = false,
  parentFilters
}) => {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set(['Slack', 'Google Drive', 'Notion']));
  
  // Handlers for duplicate management
  const handleLinkVersions = async (newerDocId: string, olderDocId: string) => {
    try {
      await ApiClient.linkDocumentVersions(newerDocId, olderDocId);
      toast.success('✅ Documents linked as versions! Search will now show only the latest version.');
      // Refresh search results
      if (onRetry) {
        await onRetry();
      }
    } catch (error) {
      console.error('Link versions error:', error);
      toast.error('❌ Failed to link documents. Please try again.');
    }
  };

  const handleDismissDuplicate = async (documentId: string, duplicateId: string) => {
    try {
      await ApiClient.dismissDuplicateDocument(documentId, duplicateId);
      toast.success('✅ Duplicate dismissed! This alert will no longer appear.');
      // Refresh search results
      if (onRetry) {
        await onRetry();
      }
    } catch (error) {
      console.error('Dismiss duplicate error:', error);
      toast.error('❌ Failed to dismiss duplicate. Please try again.');
    }
  };
  
  // Get filters from parent
  const sourceFilter = parentFilters?.applications || [];
  const typeFilter = parentFilters?.documentTypes || [];

  // Group results by source
  const groupedResults = data.results.reduce((acc, result) => {
    if (!acc[result.source]) {
      acc[result.source] = [];
    }
    acc[result.source].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Helper function to normalize source names for comparison
  const normalizeSourceName = (source: string): string => {
    return source
      .replace(/_/g, ' ')  // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to get display name for source
  const getSourceDisplayName = (source: string): string => {
    const normalized = normalizeSourceName(source);
    // Handle special cases
    const displayNames: Record<string, string> = {
      'Google Drive': 'Google Drive',
      'Notion': 'Notion',
      'Slack': 'Slack'
    };
    return displayNames[normalized] || normalized;
  };

  // Filter results
  const filteredResults = Object.entries(groupedResults)
    .filter(([source]) => {
      if (sourceFilter.length === 0) return true;
      
      // Normalize both the source and filter values for comparison
      const normalizedSource = normalizeSourceName(source);
      return sourceFilter.some(filter => 
        normalizeSourceName(filter) === normalizedSource
      );
    })
    .reduce((acc, [source, results]) => {
      // Filter by type if type filter is active
      let filteredSourceResults = results;
      if (typeFilter.length > 0) {
        filteredSourceResults = results.filter(result => typeFilter.includes(result.type));
      }
      
      acc[source] = filteredSourceResults;
      return acc;
    }, {} as Record<string, SearchResult[]>);

  const toggleSourceExpansion = (source: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(source)) {
        newSet.delete(source);
      } else {
        newSet.add(source);
      }
      return newSet;
    });
  };

  const totalFilteredResults = Object.values(filteredResults).reduce((sum, results) => sum + results.length, 0);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data.results || data.results.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
            <SearchX className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">No results found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We couldn't find any results for "{data.query}". Try adjusting your search terms or check your connected sources.
            </p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* AI Summary Section */}
      <AISummary 
        summary={data.aiSummary} 
        query={data.query}
        totalResults={data.totalResults}
        summaryVersions={summaryVersions}
        onRegenerate={onRegenerateSummary}
        isRegenerating={isRegeneratingSummary}
        canRegenerate={canRegenerateSummary}
        isClosedThread={isClosedThread}
      />

      {/* Results Sections */}
      <div className="space-y-6">
        {Object.entries(filteredResults).map(([source, results], index) => (
          <SourceSection
            key={source}
            source={source}
            results={results}
            isExpanded={expandedSources.has(source)}
            onToggleExpansion={() => toggleSourceExpansion(source)}
            onResultClick={onResultClick}
            onLinkVersions={handleLinkVersions}
            onDismissDuplicate={handleDismissDuplicate}
            animationDelay={index * 100}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="px-8 py-3"
          >
            <Loader2 className="w-4 h-4 mr-2" />
            Load More Results
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
