import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import aiIllustration from '@/assets/ai-search-illustration.jpg';

// SVG Icon Components
const SlackIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 122.8 122.8"
    className={className}
  >
    <path
      fill="#36C5F0"
      d="M30.3 77.7c0 5.6-4.6 10.2-10.2 10.2S10 83.3 10 77.7s4.6-10.2 10.2-10.2h10.1v10.2zm5.1 0c0-5.6 4.6-10.2 10.2-10.2s10.2 4.6 10.2 10.2v25.1c0 5.6-4.6 10.2-10.2 10.2s-10.2-4.6-10.2-10.2V77.7z"
    />
    <path
      fill="#2EB67D"
      d="M45.6 30.3c-5.6 0-10.2-4.6-10.2-10.2S40 10 45.6 10s10.2 4.6 10.2 10.2v10.1H45.6zm0 5.1c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2H20.5C14.9 55.8 10.3 51.2 10.3 45.6s4.6-10.2 10.2-10.2h25.1z"
    />
    <path
      fill="#ECB22E"
      d="M92.5 45.6c0-5.6 4.6-10.2 10.2-10.2s10.2 4.6 10.2 10.2-4.6 10.2-10.2 10.2H92.5V45.6zm-5.1 0c0 5.6-4.6 10.2-10.2 10.2s-10.2-4.6-10.2-10.2V20.5C67 14.9 71.6 10.3 77.2 10.3s10.2 4.6 10.2 10.2v25.1z"
    />
    <path
      fill="#E01E5A"
      d="M77.2 92.5c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2-10.2-4.6-10.2-10.2V92.5h10.2zm0-5.1c-5.6 0-10.2-4.6-10.2-10.2s4.6-10.2 10.2-10.2h25.1c5.6 0 10.2 4.6 10.2 10.2s-4.6 10.2-10.2 10.2H77.2z"
    />
  </svg>
);


const GoogleDriveIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 512 512"
    className={className}
  >
    {/* Left (green) */}
    <path
      fill="#0F9D58"
      d="M160 32L0 320l96 160 160-288z"
    />
    {/* Right (yellow) */}
    <path
      fill="#FFBB00"
      d="M352 32h-192l160 288h192z"
    />
    {/* Bottom (blue) */}
    <path
      fill="#4285F4"
      d="M96 480h320l96-160H192z"
    />
  </svg>
);


const NotionIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.033-.793c1.635-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.747.934 1.213v16.378c0 1.026-.373 1.635-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.68-1.632z"
    />
  </svg>
);

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
    { 
      name: 'Slack', 
      icon: SlackIcon, 
      color: 'slack',
      tooltip: 'Search Slack'
    },
    { 
      name: 'Google Drive', 
      icon: GoogleDriveIcon, 
      color: 'google',
      tooltip: 'Search Google Drive'
    },
    { 
      name: 'Notion', 
      icon: NotionIcon, 
      color: 'notion',
      tooltip: 'Search Notion'
    },
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
        {/* Heading and tagline */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-5xl font-light text-foreground tracking-tight">
            Your Work, Connected
          </h1>
          <p className="text-xl text-muted-foreground/80 font-light max-w-2xl mx-auto leading-relaxed">
            All your scattered knowledge, one search away.
          </p>
        </div>

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
        <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
            <span className="font-medium">Connected sources:</span>
            <div className="flex items-center gap-2">
              {connectedSources.map((source, index) => (
                <TooltipProvider key={source.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`
                          group relative w-8 h-8 rounded-md flex items-center justify-center cursor-pointer
                          transition-all duration-200 ease-in-out
                          hover:scale-105
                          text-muted-foreground/70 hover:text-foreground
                          ${source.color === 'slack' ? 
                            'hover:text-[#4A154B]' :
                            source.color === 'google' ?
                            'hover:text-[#4285F4]' :
                            'hover:text-[#000000]'
                          }
                        `}
                        style={{ 
                          animationDelay: `${0.7 + index * 0.1}s`
                        }}
                      >
                        <source.icon className="w-4 h-4 transition-colors duration-200 ease-in-out" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-card/95 backdrop-blur-sm border border-border/50 text-foreground text-xs">
                      <p>{source.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;