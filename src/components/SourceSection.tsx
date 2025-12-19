
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ResultCard from './ResultCard';
import { SearchResult } from './SearchResults';

// Icon Components
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
    <path
      fill="#4285F4"
      d="M160 32L0 320l96 160 160-288z"
    />
    <path
      fill="#FFBB00"
      d="M352 32h-192l160 288h192z"
    />
    <path
      fill="#34A853"
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

const JiraIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M9.051 15.434H7.734c-1.988 0-3.413-1.218-3.413-3h7.085c.367 0 .605.26.605.63v7.13c-1.772 0-2.96-1.435-2.96-3.434zm3.5-3.543h-1.318c-1.987 0-3.413-1.196-3.413-2.978h7.085c.367 0 .627.239.627.608v7.13c-1.772 0-2.981-1.435-2.981-3.434zm3.52-3.522h-1.317c-1.987 0-3.413-1.217-3.413-3h7.085c.367 0 .605.262.605.61v7.129c-1.771 0-2.96-1.435-2.96-3.434z"
    />
  </svg>
);

const TodoistIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="#E44332"
      d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zm-2.5 18.5c0 .275-.225.5-.5.5h-11c-.275 0-.5-.225-.5-.5v-1c0-.275.225-.5.5-.5h11c.275 0 .5.225.5.5v1zm0-4c0 .275-.225.5-.5.5h-11c-.275 0-.5-.225-.5-.5v-1c0-.275.225-.5.5-.5h11c.275 0 .5.225.5.5v1zm0-4c0 .275-.225.5-.5.5h-11c-.275 0-.5-.225-.5-.5v-1c0-.275.225-.5.5-.5h11c.275 0 .5.225.5.5v1z"
    />
  </svg>
);

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
        return <SlackIcon className="w-5 h-5" />;
      case 'Google Drive':
        return <GoogleDriveIcon className="w-5 h-5" />;
      case 'Notion':
        return <NotionIcon className="w-5 h-5" />;
      case 'Jira':
        return <JiraIcon className="w-5 h-5" />;
      case 'Todoist':
        return <TodoistIcon className="w-5 h-5" />;
      default:
        return <SlackIcon className="w-5 h-5 opacity-50" />;
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
      case 'Todoist':
        return {
          bg: 'bg-[#E44332]/10',
          border: 'border-[#E44332]/20',
          text: 'text-[#E44332]',
          hover: 'hover:bg-[#E44332]/15'
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
