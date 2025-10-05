

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Filter, SortAsc, SortDesc, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AISummary from './AISummary';
import SourceSection from './SourceSection';
import ResultCard from './ResultCard';
import LoadingSkeleton from './LoadingSkeleton';

// Types
export interface SearchResult {
  id: string;
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
}

const SearchResults: React.FC<SearchResultsProps> = ({
  data,
  isLoading = false,
  onResultClick,
  onRetry,
  onLoadMore,
  hasMore = false
}) => {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set(['Slack', 'Google Drive', 'Notion']));
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'source'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Group results by source
  const groupedResults = data.results.reduce((acc, result) => {
    if (!acc[result.source]) {
      acc[result.source] = [];
    }
    acc[result.source].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Sort results within each group
  const sortResults = (results: SearchResult[]) => {
    return [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          break;
        case 'source':
          comparison = a.source.localeCompare(b.source);
          break;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  };

  // Filter and sort results
  const filteredResults = Object.entries(groupedResults)
    .filter(([source]) => sourceFilter.length === 0 || sourceFilter.includes(source))
    .reduce((acc, [source, results]) => {
      acc[source] = sortResults(results);
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

  const clearSourceFilter = () => setSourceFilter([]);

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
            <RefreshCw className="w-12 h-12 text-muted-foreground" />
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
      />

      {/* Controls Section */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        {/* Left side - Filters and Search */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-2">
              {['Slack', 'Google Drive', 'Notion'].map((source) => (
                <Button
                  key={source}
                  variant={sourceFilter.includes(source) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSourceFilter(prev => 
                      prev.includes(source) 
                        ? prev.filter(s => s !== source)
                        : [...prev, source]
                    );
                  }}
                  className="h-8 text-xs"
                >
                  {source}
                  {sourceFilter.includes(source) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
              {sourceFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSourceFilter}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Sort and Results count */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {totalFilteredResults} result{totalFilteredResults !== 1 ? 's' : ''}
            {sourceFilter.length > 0 && (
              <span className="ml-1">
                from {sourceFilter.join(', ')}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="source">Source</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="h-8 w-8 p-0"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

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
