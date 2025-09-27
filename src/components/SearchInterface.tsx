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
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
      </div>

      {/* Main search interface */}
      <div className="w-full max-w-3xl space-y-10 animate-scale-in relative z-10">
        {/* Search form */}
        <form onSubmit={handleSearch} className="relative">
          <div 
            className={`
              relative transition-all duration-500 
              ${isFocused ? 'transform scale-102' : ''}
            `}
          >
            <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${isFocused ? 'shadow-[0_0_50px_hsl(262_83%_70%_/_0.3)]' : 'shadow-[var(--shadow-elegant)]'}`} />
            <div className="relative bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-6">
                <Search className="w-7 h-7 text-muted-foreground flex-shrink-0" />
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search across Slack, Google Drive, and Notion…"
                  className="flex-1 border-0 bg-transparent text-xl placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 font-light"
                />
                <Button 
                  type="submit" 
                  variant="search"
                  size="lg"
                  className="px-10 py-3 font-medium text-base rounded-xl"
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Recent searches */}
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-muted-foreground/80 font-medium">Recent searches</p>
          <div className="flex flex-wrap gap-3">
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="px-5 py-3 bg-secondary/60 text-secondary-foreground rounded-full cursor-pointer hover:bg-secondary/80 hover:scale-105 transition-all duration-300 text-sm font-medium border border-border/30 hover:border-border/60 backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                {search}
              </div>
            ))}
          </div>
        </div>

        {/* Connected sources */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground/70">
            <span className="font-medium">Connected sources:</span>
            <div className="flex items-center gap-4 ml-2">
              {connectedSources.map((source, index) => (
                <div key={source.name} className="flex items-center gap-2 opacity-75 hover:opacity-100 transition-opacity duration-300">
                  <source.icon className="w-4 h-4" style={{ color: `hsl(var(--${source.color}))` }} />
                  <span className="text-xs font-medium">{source.name}</span>
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