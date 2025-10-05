

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchResults from '@/components/SearchResults';
import { SearchResultsData } from '@/components/SearchResults';
import { simulateSearch } from '@/data/mockSearchResults';

const SearchResultsDemo: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo queries for quick testing
  const demoQueries = [
    "Q3 performance metrics and team productivity",
    "Product roadmap and feature planning", 
    "User feedback and support tickets",
    "Team meeting notes and discussions",
    "Customer success metrics and analytics"
  ];

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSearchQuery(query);
    
    try {
      const results = await simulateSearch(query);
      setSearchResults(results);
    } catch (err) {
      setError('Failed to load search results. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  const handleResultClick = (result: any) => {
    console.log('Result clicked:', result);
    // In a real app, this would navigate to the source or open a modal
    alert(`Opening ${result.title} from ${result.source}`);
  };

  const handleBackToSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSearch}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Search
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Search Results Demo</h1>
                <p className="text-sm text-muted-foreground">
                  Interactive demonstration of Haven7's search results interface
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Powered by</span>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">H7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {!searchResults && !isLoading && (
          <div className="space-y-8">
            {/* Search Interface */}
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Try the Search Results Experience
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Enter a search query or click one of the demo queries below to see the 
                  comprehensive search results interface in action.
                </p>
              </div>

              {/* Search Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const query = formData.get('query') as string;
                  handleSearch(query);
                }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/5 blur-xl" />
                  <div className="relative bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-4">
                      <Search className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <input
                        name="query"
                        type="text"
                        placeholder="Search across Slack, Google Drive, and Notion..."
                        className="flex-1 bg-transparent border-0 text-lg placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
                        defaultValue={searchQuery}
                      />
                      <Button 
                        type="submit" 
                        variant="search"
                        size="lg"
                        className="px-8 py-3 font-medium rounded-xl"
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Demo Queries */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium">Or try these demo queries:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {demoQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(query)}
                      className="px-4 py-2 bg-secondary/60 text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 hover:scale-105 transition-all duration-200 border border-border/30 hover:border-border/60 backdrop-blur-sm"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Features Overview */}
            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <div className="text-center space-y-4 p-6 bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Search className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">AI-Powered Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Get intelligent summaries that synthesize insights across all your connected sources
                </p>
              </div>
              
              <div className="text-center space-y-4 p-6 bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <div className="w-6 h-6 text-primary-foreground">📊</div>
                </div>
                <h3 className="font-semibold text-foreground">Smart Filtering</h3>
                <p className="text-sm text-muted-foreground">
                  Filter results by source, date, relevance, and more with intuitive controls
                </p>
              </div>
              
              <div className="text-center space-y-4 p-6 bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <div className="w-6 h-6 text-primary-foreground">🎨</div>
                </div>
                <h3 className="font-semibold text-foreground">Elegant Design</h3>
                <p className="text-sm text-muted-foreground">
                  Beautiful, responsive interface with smooth animations and dark theme
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {(searchResults || isLoading || error) && (
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Searching across your sources...</p>
              </div>
            )}
            
            {error && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <div className="w-8 h-8 text-destructive">⚠️</div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Search Error</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleRetry} variant="outline">
                  Try Again
                </Button>
              </div>
            )}
            
            {searchResults && !isLoading && !error && (
              <SearchResults
                data={searchResults}
                isLoading={isLoading}
                onResultClick={handleResultClick}
                onRetry={handleRetry}
                hasMore={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsDemo;
