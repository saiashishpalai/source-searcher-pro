

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Edit2, Trash2, Plus, Filter, X, Calendar, FileText, File, Table, Clock, ChevronDown, Check, RotateCcw, ArrowLeft, Menu, Home, User, Settings, LogOut, Send, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import aiIllustration from '@/assets/ai-search-illustration.jpg';
import SearchResults from './SearchResults';
import { SearchResultsData } from './SearchResults';
import { simulateSearch } from '@/data/mockSearchResults';

// SVG Icon Components
const Haven7Icon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    className={className}
  >
    <defs>
      <linearGradient id="haven7Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    
    {/* Central hub circle */}
    <circle cx="16" cy="16" r="12" fill="url(#haven7Gradient)" />
    
    {/* Connection lines radiating outward */}
    <path
      stroke="url(#accentGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      d="M16 4L16 8M16 24L16 28M4 16L8 16M24 16L28 16M6.34 6.34L9.17 9.17M22.83 22.83L25.66 25.66M6.34 25.66L9.17 22.83M22.83 9.17L25.66 6.34"
    />
    
    {/* Central dot */}
    <circle cx="16" cy="16" r="3" fill="white" />
    
    {/* Small connection dots */}
    <circle cx="16" cy="6" r="1.5" fill="url(#accentGradient)" />
    <circle cx="16" cy="26" r="1.5" fill="url(#accentGradient)" />
    <circle cx="6" cy="16" r="1.5" fill="url(#accentGradient)" />
    <circle cx="26" cy="16" r="1.5" fill="url(#accentGradient)" />
    <circle cx="9.17" cy="9.17" r="1.5" fill="url(#accentGradient)" />
    <circle cx="22.83" cy="22.83" r="1.5" fill="url(#accentGradient)" />
    <circle cx="9.17" cy="22.83" r="1.5" fill="url(#accentGradient)" />
    <circle cx="22.83" cy="9.17" r="1.5" fill="url(#accentGradient)" />
  </svg>
);

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
    {/* Left (blue) */}
    <path
      fill="#4285F4"
      d="M160 32L0 320l96 160 160-288z"
    />
    {/* Right (yellow) */}
    <path
      fill="#FFBB00"
      d="M352 32h-192l160 288h192z"
    />
    {/* Bottom (green) */}
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

// Enhanced dummy data with more detailed results
const dummyConversations = [
  {
    id: '1',
    title: 'Q3 Performance Metrics',
    timestamp: '2024-01-15T10:30:00Z',
    query: 'Show me Q3 performance metrics and team productivity data',
    results: [
      { 
        source: 'Slack', 
        content: 'Team standup notes from Q3 showing 15% productivity increase',
        author: 'Sarah Chen',
        timestamp: '2024-01-15T09:00:00Z',
        type: 'message',
        channel: '#general'
      },
      { 
        source: 'Google Drive', 
        content: 'Q3 Performance Report.pdf - Revenue up 23%',
        author: 'Mike Johnson',
        timestamp: '2024-01-14T16:30:00Z',
        type: 'pdf',
        filename: 'Q3_Performance_Report.pdf'
      },
      { 
        source: 'Notion', 
        content: 'Q3 OKR tracking - 8/10 goals achieved',
        author: 'Alex Rivera',
        timestamp: '2024-01-13T11:15:00Z',
        type: 'doc',
        page: 'Q3 OKRs'
      }
    ]
  },
  {
    id: '2',
    title: 'Product Roadmap Planning',
    timestamp: '2024-01-14T14:20:00Z',
    query: 'Find all documents related to product roadmap and feature planning',
    results: [
      { 
        source: 'Notion', 
        content: 'Product Roadmap 2024 - Next quarter priorities',
        author: 'Emma Wilson',
        timestamp: '2024-01-14T13:00:00Z',
        type: 'doc',
        page: 'Product Roadmap'
      },
      { 
        source: 'Google Drive', 
        content: 'Feature Requirements v2.1.docx',
        author: 'David Kim',
        timestamp: '2024-01-13T15:45:00Z',
        type: 'doc',
        filename: 'Feature_Requirements_v2.1.docx'
      },
      { 
        source: 'Slack', 
        content: 'Product team discussion about MVP features',
        author: 'Lisa Park',
        timestamp: '2024-01-12T10:30:00Z',
        type: 'message',
        channel: '#product'
      }
    ]
  },
  {
    id: '3',
    title: 'Profile Feedback Analysis',
    timestamp: '2024-01-13T09:15:00Z',
    query: 'Compile user feedback from support tickets and surveys',
    results: [
      { 
        source: 'Slack', 
        content: 'Support team feedback summary - 47 tickets resolved',
        author: 'Tom Anderson',
        timestamp: '2024-01-12T14:20:00Z',
        type: 'message',
        channel: '#support'
      },
      { 
        source: 'Google Drive', 
        content: 'Profile Survey Results Q4 2023.xlsx',
        author: 'Maria Garcia',
        timestamp: '2024-01-11T11:00:00Z',
        type: 'excel',
        filename: 'Profile_Survey_Results_Q4_2023.xlsx'
      },
      { 
        source: 'Notion', 
        content: 'Customer feedback database - 89% satisfaction rate',
        author: 'James Lee',
        timestamp: '2024-01-10T16:15:00Z',
        type: 'doc',
        page: 'Customer Feedback'
      }
    ]
  },
  {
    id: '4',
    title: 'Team Meeting Notes',
    timestamp: '2024-01-12T16:45:00Z',
    query: 'Find all team meeting notes from this week',
    results: [
      { 
        source: 'Slack', 
        content: 'Weekly standup notes - Sprint 23 progress',
        author: 'Rachel Green',
        timestamp: '2024-01-12T09:00:00Z',
        type: 'message',
        channel: '#standup'
      },
      { 
        source: 'Notion', 
        content: 'All-hands meeting notes - Company updates',
        author: 'CEO',
        timestamp: '2024-01-11T14:00:00Z',
        type: 'doc',
        page: 'All-Hands Meeting'
      },
      { 
        source: 'Google Drive', 
        content: 'Design review meeting - UI/UX feedback',
        author: 'Sophie Chen',
        timestamp: '2024-01-10T15:30:00Z',
        type: 'pdf',
        filename: 'Design_Review_Meeting.pdf'
      }
    ]
  }
];

const SearchInterface = () => {
  // Auth context
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [conversations, setConversations] = useState(dummyConversations);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    'Q3 performance metrics',
    'Team standup notes',
    'Product roadmap draft',
    'Profile feedback analysis',
  ]);
  
  // Search results state
  const [searchResults, setSearchResults] = useState<SearchResultsData | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Follow-up conversation state
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    applications: [] as string[],
    authors: [] as string[],
    timeRange: 'latest' as string,
    dateRange: { start: '', end: '' },
    documentTypes: [] as string[],
    quickPreset: '' as string
  });

  // Dropdown states
  const [openDropdowns, setOpenDropdowns] = useState({
    applications: false,
    authors: false,
    documentTypes: false,
    sort: false
  });

  const dropdownRefs = {
    applications: useRef<HTMLDivElement>(null),
    authors: useRef<HTMLDivElement>(null),
    documentTypes: useRef<HTMLDivElement>(null),
    sort: useRef<HTMLDivElement>(null)
  };

  const handleRemoveRecentSearch = (index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  };

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    setIsSearchLoading(true);
    setSearchError(null);
    setShowSearchResults(true);
    setSelectedThread(null); // Clear any selected thread
    
    try {
      // Create search query with filters
      const searchQuery = {
        query: searchValue,
        filters: {
          applications: filters.applications,
          authors: filters.authors,
          documentTypes: filters.documentTypes,
          timeRange: filters.timeRange,
          dateRange: filters.dateRange
        }
      };
      
      const results = await simulateSearch(searchValue);
      
      // Apply filters to results if any are selected
      if (filters.applications.length > 0 || filters.authors.length > 0 || filters.documentTypes.length > 0) {
        const filteredResults = results.results.filter(result => {
          const matchesApplication = filters.applications.length === 0 || filters.applications.includes(result.source);
          const matchesAuthor = filters.authors.length === 0 || filters.authors.includes(result.author);
          const matchesType = filters.documentTypes.length === 0 || filters.documentTypes.includes(result.type);
          return matchesApplication && matchesAuthor && matchesType;
        });
        
        results.results = filteredResults;
        results.totalResults = filteredResults.length;
      }
      
      setSearchResults(results);
      
      // Add to recent searches if not already there
      setRecentSearches(prev => {
        const newSearches = [searchValue, ...prev.filter(s => s !== searchValue)];
        return newSearches.slice(0, 10); // Keep only last 10 searches
      });
    } catch (error) {
      setSearchError('Failed to load search results. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleThreadClick = (threadId: string) => {
    setSelectedThread(threadId);
    setShowMobileSidebar(false); // Close mobile sidebar when selecting a thread
  };

  const handleBackToSearch = () => {
    setSelectedThread(null);
    setShowSearchResults(false);
    setSearchResults(null);
    setSearchError(null);
  };

  const handleNewConversation = () => {
    setSelectedThread(null);
    setShowSearchResults(false);
    setSearchResults(null);
    setSearchError(null);
    setSearchValue(''); // Clear any existing search
  };

  const handleResultClick = (result: unknown) => {
    // Handle result card click - could open a detailed view or continue conversation
    console.log('Result clicked:', result);
  };

  // Search results handlers
  const handleSearchResultClick = (result: any) => {
    console.log('Search result clicked:', result);
    // In a real app, this would:
    // 1. Open the source document in a new tab
    // 2. Show a preview modal
    // 3. Navigate to a detailed view
    // 4. Or continue the conversation with context
    alert(`Opening ${result.title} from ${result.source}`);
  };

  const handleSearchRetry = async () => {
    if (searchResults?.query) {
      await handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;
    
    setIsFollowUpLoading(true);
    
    try {
      // Simulate follow-up question processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (selectedThread) {
        // Handle follow-up in conversation thread
        const thread = conversations.find(t => t.id === selectedThread);
        if (thread) {
          console.log('Follow-up question in conversation:', followUpQuery);
          // In a real app, this would make an API call to process the follow-up
          // For now, we'll just show a success message
        }
      } else if (searchResults) {
        // Handle follow-up in search results - perform new search with follow-up query
        const combinedQuery = `${searchResults.query} ${followUpQuery}`;
        
        setIsSearchLoading(true);
        setSearchError(null);
        
        try {
          const results = await simulateSearch(combinedQuery);
          setSearchResults(results);
          
          // Add to recent searches
          setRecentSearches(prev => {
            const newSearches = [combinedQuery, ...prev.filter(s => s !== combinedQuery)];
            return newSearches.slice(0, 10);
          });
        } catch (error) {
          setSearchError('Failed to process follow-up question. Please try again.');
          console.error('Follow-up search error:', error);
        } finally {
          setIsSearchLoading(false);
        }
      }
      
      setFollowUpQuery('');
    } catch (error) {
      console.error('Follow-up error:', error);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const handleRenameThread = (threadId: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(thread => 
        thread.id === threadId ? { ...thread, title: newTitle } : thread
      )
    );
    setEditingThread(null);
    setEditTitle('');
  };

  const handleDeleteThread = (threadId: string) => {
    setConversations(prev => prev.filter(thread => thread.id !== threadId));
    if (selectedThread === threadId) {
      setSelectedThread(null);
    }
  };

  const startEditing = (threadId: string, currentTitle: string) => {
    setEditingThread(threadId);
    setEditTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingThread(null);
    setEditTitle('');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Filter logic
  const getFilteredResults = () => {
    if (!selectedThread) return [];
    
    const thread = conversations.find(t => t.id === selectedThread);
    if (!thread) return [];
    
    let filteredResults = [...thread.results];
    
    // Filter by applications
    if (filters.applications.length > 0) {
      filteredResults = filteredResults.filter(result => 
        filters.applications.includes(result.source)
      );
    }
    
    // Filter by authors
    if (filters.authors.length > 0) {
      filteredResults = filteredResults.filter(result => 
        filters.authors.includes(result.author)
      );
    }
    
    // Filter by document types
    if (filters.documentTypes.length > 0) {
      filteredResults = filteredResults.filter(result => 
        filters.documentTypes.includes(result.type)
      );
    }
    
    // Filter by time
    if (filters.timeRange === 'oldest') {
      filteredResults.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else {
      filteredResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    return filteredResults;
  };

  const toggleFilter = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: Array.isArray(prev[filterType as keyof typeof prev])
        ? (prev[filterType as keyof typeof prev] as string[]).includes(value)
          ? (prev[filterType as keyof typeof prev] as string[]).filter(item => item !== value)
          : [...(prev[filterType as keyof typeof prev] as string[]), value]
        : prev[filterType as keyof typeof prev]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      applications: [],
      authors: [],
      timeRange: 'latest',
      dateRange: { start: '', end: '' },
      documentTypes: [],
      quickPreset: ''
    });
  };

  const getUniqueValues = (key: string) => {
    if (!selectedThread) return [];
    const thread = conversations.find(t => t.id === selectedThread);
    if (!thread) return [];
    return Array.from(new Set(thread.results.map(result => result[key as keyof typeof result])));
  };

  // Dropdown management
  const toggleDropdown = (dropdown: keyof typeof openDropdowns) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  const closeAllDropdowns = () => {
    setOpenDropdowns({
      applications: false,
      authors: false,
      documentTypes: false,
      sort: false
    });
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isOutside = Object.values(dropdownRefs).every(ref => 
        ref.current && !ref.current.contains(target)
      );
      if (isOutside) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get filter counts for badges
  const getFilterCounts = () => ({
    applications: filters.applications.length,
    authors: filters.authors.length,
    documentTypes: filters.documentTypes.length,
    sort: filters.timeRange !== 'latest' ? 1 : 0
  });

  // Get application icon
  const getApplicationIcon = (source: string) => {
    switch (source) {
      case 'Slack': return <SlackIcon className="w-4 h-4" />;
      case 'Google Drive': return <GoogleDriveIcon className="w-4 h-4" />;
      case 'Notion': return <NotionIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get document type icon
  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <File className="w-4 h-4" />;
      case 'doc': return <FileText className="w-4 h-4" />;
      case 'excel': return <Table className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Left Sidebar - Enhanced modern design */}
      <div className={`
        fixed lg:relative lg:translate-x-0 transition-all duration-500 ease-in-out z-50
        ${sidebarCollapsed ? 'w-16' : 'w-80'} 
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-gradient-to-b from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-r border-border/30 flex flex-col h-screen
        shadow-2xl shadow-black/20
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-80'}
      `}>
        {/* Sidebar Header - Enhanced */}
        <div className={`border-b border-border/20 bg-gradient-to-r from-card/40 to-transparent ${sidebarCollapsed ? 'p-4 lg:p-6' : 'p-6'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              {/* Toggle sidebar icon - centered */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-10 w-10 p-0 rounded-xl hover:bg-primary/20 hover:scale-110 transition-all duration-300 group"
              >
                <Menu className="w-4 h-4 group-hover:text-primary transition-colors" />
              </Button>
              {/* New conversation icon - centered below */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 w-10 p-0 rounded-xl border-primary/30 hover:border-primary/60 hover:bg-primary/10 hover:scale-110 transition-all duration-300 group"
                title="New Conversation"
                onClick={handleNewConversation}
              >
                <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-lg">H7</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Haven7</h2>
                    <p className="text-xs text-muted-foreground">AI Search</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="h-10 w-10 p-0 rounded-xl hover:bg-primary/20 hover:scale-110 transition-all duration-300 group"
                >
                  <Menu className="w-4 h-4 group-hover:text-primary transition-colors" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300 py-3 rounded-xl border-border/50"
                onClick={handleNewConversation}
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </Button>
            </div>
          )}
        </div>

        {/* Thread List - Enhanced */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversations.map((thread, index) => (
              <div
                key={thread.id}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-slide-in-from-left ${
                  selectedThread === thread.id
                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 shadow-lg shadow-primary/10'
                    : 'hover:bg-gradient-to-r hover:from-secondary/30 hover:to-secondary/20 border border-transparent hover:border-border/30 hover:shadow-md'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleThreadClick(thread.id)}
              >
                {editingThread === thread.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameThread(thread.id, editTitle);
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      onBlur={() => handleRenameThread(thread.id, editTitle)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                          {thread.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(thread.timestamp)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {thread.results.slice(0, 3).map((result, idx) => (
                              <div
                                key={idx}
                                className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-xs font-medium"
                                title={result.source}
                              >
                                {result.source.charAt(0)}
                              </div>
                            ))}
                            {thread.results.length > 3 && (
                              <div className="w-5 h-5 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center text-xs font-medium">
                                +{thread.results.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {thread.results.length} result{thread.results.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg hover:bg-primary/20 hover:text-primary transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(thread.id, thread.title);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/20 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteThread(thread.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-screen">
        {/* Main Header - Fixed layout */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border/30 bg-background/80 backdrop-blur-sm">
          {/* Left section: Sidebar toggle + Haven7 logo */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Haven7 logo */}
            <span className="text-xl font-semibold text-white leading-none">Haven7</span>
          </div>
          
          {/* Right section: Profile */}
          <div className="flex items-center gap-4 pr-6">
            {/* User avatar with dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full p-0 bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-200 flex items-center justify-center"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/api/placeholder/32/32" alt="User" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-card/95 backdrop-blur-sm border-border/50 z-[9999] shadow-lg"
                sideOffset={8}
                alignOffset={-8}
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="hover:bg-accent/50 cursor-pointer"
                  onClick={() => {
                    console.log('🔗 Navigating to connected-sources from Profile Settings');
                    navigate('/connected-sources');
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-accent/50 cursor-pointer"
                  onClick={() => {
                    console.log('🔗 Navigating to connected-sources');
                    navigate('/connected-sources');
                  }}
                >
                  <Link className="w-4 h-4 mr-2" />
                  Connected Sources
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="hover:bg-destructive/10 text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Secondary Header - Navigation elements */}
        {(selectedThread || showSearchResults) && (
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-border/20 bg-background/60 backdrop-blur-sm">
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
            </div>
            
            {/* Center: Current page title */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="w-4 h-4" />
                <span>/</span>
                <span className="text-foreground font-medium">
                  {showSearchResults ? `Search Results for "${searchValue}"` : conversations.find(t => t.id === selectedThread)?.title}
                </span>
              </div>
            </div>
            
            {/* Right side: Empty for balance */}
            <div className="w-16"></div>
          </div>
        )}


        {/* Content Area */}
        <div className={`flex-1 relative ${showSearchResults ? 'overflow-y-auto' : 'flex items-center justify-center'} p-4 lg:p-6`}>
          {/* Subtle background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl animate-background-drift" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-accent/8 to-primary/5 rounded-full blur-3xl animate-background-drift" style={{ animationDelay: '10s' }} />
          </div>

        {/* Main search interface, search results, or conversation view */}
        {showSearchResults ? (
          <div className="w-full relative z-10 pb-8">
            {/* Advanced Filters for Search Results */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filter Results</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear all
                </Button>
              </div>

              {/* Compact Filter Row */}
              <div className="flex flex-wrap gap-2">
                {/* Applications Filter */}
                <div className="relative" ref={dropdownRefs.applications}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('applications')}
                    className={`h-8 px-3 text-xs font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.applications ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Apps</span>
                      {getFilterCounts().applications > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          {getFilterCounts().applications}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${
                      openDropdowns.applications ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.applications && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {['Slack', 'Google Drive', 'Notion'].map((source) => (
                            <button
                              key={source}
                              onClick={() => toggleFilter('applications', source)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-1.5">
                                {getApplicationIcon(source)}
                                <span>{source}</span>
                              </div>
                              {filters.applications.includes(source) && (
                                <Check className="w-3 h-3 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Authors Filter */}
                <div className="relative" ref={dropdownRefs.authors}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('authors')}
                    className={`h-8 px-3 text-xs font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.authors ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Authors</span>
                      {getFilterCounts().authors > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          {getFilterCounts().authors}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${
                      openDropdowns.authors ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.authors && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {['Sarah Chen', 'Mike Johnson', 'Alex Rivera', 'Emma Wilson', 'David Kim'].map((author) => (
                            <button
                              key={author}
                              onClick={() => toggleFilter('authors', author)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                  {author.charAt(0)}
                                </div>
                                <span>{author}</span>
                              </div>
                              {filters.authors.includes(author) && (
                                <Check className="w-3 h-3 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Document Types Filter */}
                <div className="relative" ref={dropdownRefs.documentTypes}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('documentTypes')}
                    className={`h-8 px-3 text-xs font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.documentTypes ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Types</span>
                      {getFilterCounts().documentTypes > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          {getFilterCounts().documentTypes}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${
                      openDropdowns.documentTypes ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.documentTypes && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {['message', 'pdf', 'doc', 'excel', 'page'].map((type) => (
                            <button
                              key={type}
                              onClick={() => toggleFilter('documentTypes', type)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-md bg-secondary/30 flex items-center justify-center text-xs font-medium">
                                  {type.charAt(0).toUpperCase()}
                                </div>
                                <span className="capitalize">{type}</span>
                              </div>
                              {filters.documentTypes.includes(type) && (
                                <Check className="w-3 h-3 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Range Filter */}
                <div className="relative" ref={dropdownRefs.sort}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('sort')}
                    className={`h-8 px-3 text-xs font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.sort ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Time</span>
                      {getFilterCounts().sort > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-xs">
                          1
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${
                      openDropdowns.sort ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.sort && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {['latest', 'last-week', 'last-month', 'last-year'].map((timeRange) => (
                            <button
                              key={timeRange}
                              onClick={() => {
                                setFilters(prev => ({ ...prev, timeRange }));
                                toggleDropdown('sort');
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <span className="capitalize">{timeRange.replace('-', ' ')}</span>
                              </div>
                              {filters.timeRange === timeRange && (
                                <Check className="w-3 h-3 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {searchResults ? (
              <>
                <SearchResults
                  data={searchResults}
                  isLoading={isSearchLoading}
                  onResultClick={handleSearchResultClick}
                  onRetry={handleSearchRetry}
                  hasMore={false}
                />
                
                {/* Follow-up Input for Search Results - Enhanced */}
                <div className="mt-8">
                  <form onSubmit={handleFollowUpQuestion} className="relative">
                    <div className="relative transition-all duration-500 hover:scale-[1.01]">
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl transition-all duration-500 shadow-[0_0_30px_hsl(262_83%_70%_/_0.15)] hover:shadow-[0_0_50px_hsl(262_83%_70%_/_0.25)]" />
                      {/* Main container */}
                      <div className="relative bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl border border-border/30 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-primary" />
                          </div>
                          <Input
                            value={followUpQuery}
                            onChange={(e) => setFollowUpQuery(e.target.value)}
                            placeholder="Ask a follow-up question about these results..."
                            className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                            disabled={isFollowUpLoading}
                          />
                          <Button
                            type="submit"
                            size="lg"
                            variant="default"
                            disabled={!followUpQuery.trim() || isFollowUpLoading}
                            className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isFollowUpLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                                Asking...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Ask
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </>
            ) : isSearchLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-muted-foreground">Searching across your sources...</p>
                </div>
              </div>
            ) : searchError ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <p className="text-destructive">{searchError}</p>
                  <Button onClick={handleSearchRetry} variant="outline">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : selectedThread ? (
          <div className="w-full max-w-4xl space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 relative z-10">
            {/* Conversation Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {conversations.find(t => t.id === selectedThread)?.title}
              </h1>
              <p className="text-muted-foreground">
                {conversations.find(t => t.id === selectedThread)?.query}
              </p>
            </div>

            {/* Modern Dropdown Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filters</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear all
                </Button>
              </div>

              {/* Dropdown Filters Row */}
              <div className="flex flex-wrap gap-3">
                {/* Applications Dropdown */}
                <div className="relative" ref={dropdownRefs.applications}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('applications')}
                    className={`h-9 px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.applications ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Applications</span>
                      {getFilterCounts().applications > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {getFilterCounts().applications}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                      openDropdowns.applications ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.applications && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {getUniqueValues('source').map((source) => (
                            <button
                              key={source}
                              onClick={() => toggleFilter('applications', source as string)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-2">
                                {getApplicationIcon(source as string)}
                                <span>{source}</span>
                              </div>
                              {filters.applications.includes(source as string) && (
                                <Check className="w-4 h-4 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Authors Dropdown */}
                <div className="relative" ref={dropdownRefs.authors}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('authors')}
                    className={`h-9 px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.authors ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Authors</span>
                      {getFilterCounts().authors > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {getFilterCounts().authors}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                      openDropdowns.authors ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.authors && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {getUniqueValues('author').map((author) => (
                            <button
                              key={author}
                              onClick={() => toggleFilter('authors', author as string)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                  {(author as string).charAt(0)}
                                </div>
                                <span>{author}</span>
                              </div>
                              {filters.authors.includes(author as string) && (
                                <Check className="w-4 h-4 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Document Types Dropdown */}
                <div className="relative" ref={dropdownRefs.documentTypes}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('documentTypes')}
                    className={`h-9 px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.documentTypes ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Types</span>
                      {getFilterCounts().documentTypes > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {getFilterCounts().documentTypes}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                      openDropdowns.documentTypes ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.documentTypes && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          {getUniqueValues('type').map((type) => (
                            <button
                              key={type}
                              onClick={() => toggleFilter('documentTypes', type as string)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-secondary/50 transition-colors duration-150"
                            >
                              <div className="flex items-center gap-2">
                                {getDocumentTypeIcon(type as string)}
                                <span className="capitalize">{type}</span>
                              </div>
                              {filters.documentTypes.includes(type as string) && (
                                <Check className="w-4 h-4 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative" ref={dropdownRefs.sort}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDropdown('sort')}
                    className={`h-9 px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-secondary/50 ${
                      openDropdowns.sort ? 'bg-secondary/30 border-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Sort</span>
                      {getFilterCounts().sort > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {filters.timeRange === 'oldest' ? 'Oldest' : 'Latest'}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                      openDropdowns.sort ? 'rotate-180' : ''
                    }`} />
                  </Button>

                  {openDropdowns.sort && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, timeRange: 'latest' }))}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-secondary/50 transition-colors duration-150"
                          >
                            <Clock className="w-4 h-4" />
                            <span>Latest</span>
                            {filters.timeRange === 'latest' && (
                              <Check className="w-4 h-4 text-primary ml-auto" />
                            )}
                          </button>
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, timeRange: 'oldest' }))}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-secondary/50 transition-colors duration-150"
                          >
                            <Clock className="w-4 h-4" />
                            <span>Oldest</span>
                            {filters.timeRange === 'oldest' && (
                              <Check className="w-4 h-4 text-primary ml-auto" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filtered Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {getFilteredResults().length} result{getFilteredResults().length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {getFilteredResults().map((result, index) => (
                <div 
                  key={index} 
                  className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:bg-card/80 hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {result.source}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {result.author}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(result.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground/90 mb-2 group-hover:text-foreground transition-colors">
                    {result.content}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                    {result.type === 'message' && result.channel && (
                      <span>#{result.channel}</span>
                    )}
                    {result.filename && (
                      <span>{result.filename}</span>
                    )}
                    {result.page && (
                      <span>📄 {result.page}</span>
                    )}
                  </div>
                  
                  {/* Hover indicator */}
                  <div className="absolute inset-0 rounded-lg border-2 border-primary/0 group-hover:border-primary/20 transition-colors duration-200 pointer-events-none" />
                </div>
              ))}
            </div>

            {/* Conversation Input - Enhanced */}
            <div className="mt-8">
              <form onSubmit={handleFollowUpQuestion} className="relative">
                <div className="relative transition-all duration-500 hover:scale-[1.01]">
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-2xl transition-all duration-500 shadow-[0_0_30px_hsl(262_83%_70%_/_0.15)] hover:shadow-[0_0_50px_hsl(262_83%_70%_/_0.25)]" />
                  {/* Main container */}
                  <div className="relative bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl border border-border/30 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <Input
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                        placeholder="Ask a follow-up question about these results..."
                        className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                        disabled={isFollowUpLoading}
                      />
                      <Button 
                        type="submit" 
                        variant="default"
                        size="lg"
                        className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!followUpQuery.trim() || isFollowUpLoading}
                      >
                        {isFollowUpLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Asking...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Ask
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

          </div>
        ) : (
      <div className="w-full max-w-3xl space-y-10 animate-in fade-in-0 slide-in-from-top-4 duration-700 relative z-10">
            {/* Heading and tagline */}
            <div className="text-center space-y-4 animate-fade-in">
              <h1 className="text-3xl lg:text-5xl font-light text-foreground tracking-tight">
                Your Work, Connected
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground/80 font-light max-w-2xl mx-auto leading-relaxed">
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
            <div className="relative bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl p-4 lg:p-8 shadow-2xl">
              <div className="flex items-center gap-3 lg:gap-6">
                <Search className="w-5 h-5 lg:w-7 lg:h-7 text-muted-foreground flex-shrink-0" />
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search across Slack, Google Drive, and Notion…"
                  className="flex-1 border-0 bg-transparent text-sm sm:text-base md:text-lg lg:text-xl placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 font-light"
                />
                <Button 
                  type="submit" 
                  variant="search"
                  size="lg"
                  className="px-6 lg:px-10 py-2 lg:py-3 font-medium text-sm lg:text-base rounded-xl"
                  disabled={isSearchLoading}
                >
                  {isSearchLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
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
                className="group relative px-5 py-3 bg-secondary/60 text-secondary-foreground rounded-full cursor-pointer hover:bg-secondary/80 hover:scale-105 transition-all duration-300 text-sm font-medium border border-border/30 hover:border-border/60 backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                onClick={() => setSearchValue(search)}
              >
                <span>{search}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveRecentSearch(index);
                  }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-muted-foreground/80 text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-muted-foreground text-sm font-bold"
                >
                  ×
                </button>
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
        )}
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;