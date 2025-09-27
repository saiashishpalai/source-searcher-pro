import React, { useState } from 'react';
import { Search, Slack, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import aiIllustration from '@/assets/ai-search-illustration.jpg';

const SearchInterface = () => {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const recentSearches = [
    'Q3 performance metrics',
    'Team standup notes',
    'Product roadmap draft',
    'User feedback analysis',
  ];

  const connectedSources = [
    { name: 'Slack', icon: Slack, color: 'slack' },
    { name: 'Google Drive', icon: FileText, color: 'google' },
    { name: 'Notion', icon: FileText, color: 'notion' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchValue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-6">
      {/* Empty state illustration */}
      <div className="mb-12 animate-fade-in">
        <img 
          src={aiIllustration} 
          alt="AI Knowledge Assistant" 
          className="w-64 h-auto opacity-60 mx-auto"
        />
      </div>

      {/* Main search interface */}
      <div className="w-full max-w-2xl space-y-8 animate-scale-in">
        {/* Search form */}
        <form onSubmit={handleSearch} className="relative">
          <div 
            className={`
              relative transition-all duration-300 
              ${isFocused ? 'transform scale-105' : ''}
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl blur-xl opacity-50" />
            <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <Search className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search across Slack, Google Drive, and Notion…"
                  className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button 
                  type="submit" 
                  variant="search"
                  size="lg"
                  className="px-8 font-medium"
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Recent searches */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-sm text-muted-foreground">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-4 py-2 cursor-pointer hover:bg-secondary/80 transition-colors"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                {search}
              </Badge>
            ))}
          </div>
        </div>

        {/* Connected sources */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Connected sources:</span>
            <div className="flex items-center gap-3 ml-2">
              {connectedSources.map((source, index) => (
                <div key={source.name} className="flex items-center gap-1">
                  <source.icon className="w-4 h-4" style={{ color: `hsl(var(--${source.color}))` }} />
                  <span>{source.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;