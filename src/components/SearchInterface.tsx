import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Edit2, Trash2, Plus, Filter, X, Calendar, FileText, File, Table, Clock, ChevronDown, Check, RotateCcw, ArrowLeft, Menu, Home, User, Settings, LogOut, Send, Link, Users, HelpCircle, Lightbulb, ChevronUp, Mic, Square, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { ApiClient } from '@/lib/api-client';
import aiIllustration from '@/assets/ai-search-illustration.jpg';
import SearchResults from './SearchResults';
import PRDBuilder from './PRDBuilder';
import { SearchResultsData } from './SearchResults';
import { simulateSearch } from '@/data/mockSearchResults';
import { Sparkles, AlertCircle } from 'lucide-react';

// SVG Icon Components
const Haven7Icon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    className={`group hover:scale-110 transition-all duration-500 ${className}`}
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
      <linearGradient id="hoverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <animateTransform
        attributeName="transform"
        attributeType="XML"
        type="rotate"
        from="0 16 16"
        to="360 16 16"
        dur="20s"
        repeatCount="indefinite"
        id="slowRotate"
      />
    </defs>
    
    {/* Animated glow effect on hover */}
    <circle cx="16" cy="16" r="16" fill="url(#hoverGradient)" opacity="0" className="group-hover:opacity-20 transition-opacity duration-500 blur-sm" />
    
    {/* Central hub circle */}
    <circle cx="16" cy="16" r="12" fill="url(#haven7Gradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    
    {/* Connection lines with flowing animation */}
    <path
      stroke="url(#accentGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      d="M16 4L16 8M16 24L16 28M4 16L8 16M24 16L28 16M6.34 6.34L9.17 9.17M22.83 22.83L25.66 25.66M6.34 25.66L9.17 22.83M22.83 9.17L25.66 6.34"
      className="group-hover:stroke-[url(#hoverGradient)] transition-all duration-500"
    >
      <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite" />
    </path>
    
    {/* Central dot with pulse effect */}
    <circle cx="16" cy="16" r="3" fill="white" className="group-hover:animate-pulse" />
    
    {/* Small connection dots with flowing colors */}
    <circle cx="16" cy="6" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="16" cy="26" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="6" cy="16" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="26" cy="16" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="9.17" cy="9.17" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="22.83" cy="22.83" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="9.17" cy="22.83" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
    <circle cx="22.83" cy="9.17" r="1.5" fill="url(#accentGradient)" className="group-hover:fill-[url(#hoverGradient)] transition-all duration-500" />
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
  const { user, session, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<{ name?: string; avatar_url?: string } | null>(null);
  
  const [searchValue, setSearchValue] = useState('');
  const [isPRDMode, setIsPRDMode] = useState(false);
  const [prdIntent, setPRDIntent] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [conversations, setConversations] = useState<typeof dummyConversations>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasConnections, setHasConnections] = useState<boolean | null>(null);
  const [isCheckingConnections, setIsCheckingConnections] = useState(true);

  // Fetch profile data for avatar
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfileData({
            name: data.name || undefined,
            avatar_url: data.avatar_url || undefined,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user]);

  // Fetch recent searches from database
  const fetchRecentSearches = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('search_queries')
        .select('query')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        const searches = data.map(item => item.query);
        setRecentSearches(searches);
      }
    } catch (error) {
      console.error('Error fetching recent searches:', error);
    }
  };

  // Save search query to database
  const saveSearchQuery = async (query: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('search_queries')
        .insert({
          user_id: user.id,
          query: query,
          results_count: 0, // Will be updated when we get actual results
          response_time: null
        });

      if (error) {
        console.error('Error saving search query:', error);
      }
    } catch (error) {
      console.error('Error saving search query:', error);
    }
  };

  // Load recent searches on mount
  useEffect(() => {
    fetchRecentSearches();
  }, [user]);

  // Check if user has connected sources
  useEffect(() => {
    const checkConnections = async () => {
      if (!user || !session?.access_token) {
        setIsCheckingConnections(false);
        return;
      }

      try {
        const connectionsData = await ApiClient.get<{ connections: any[] }>('/api/connections/get');
        const hasConnections = connectionsData.connections && connectionsData.connections.length > 0;
        setHasConnections(hasConnections);
      } catch (error) {
        console.error('Error checking connections:', error);
        // Default to showing empty state if check fails
        setHasConnections(false);
      } finally {
        setIsCheckingConnections(false);
      }
    };

    checkConnections();
  }, [user, session]);

  // Load threads from database on mount
  useEffect(() => {
    const loadThreads = async () => {
      if (!user) {
        setIsLoadingThreads(false);
        return;
      }
      
      try {
        const { data: threads, error } = await (supabase as any)
          .from('search_threads')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && threads) {
          // Fetch results for each thread
          const threadsWithResults = await Promise.all(
            threads.map(async (thread: any) => {
              // Fetch all rows without .single() to avoid 406 errors
              const { data: resultsData, error: resultsError } = await (supabase as any)
                .from('search_thread_results')
                .select('result_data')
                .eq('thread_id', thread.id)
                .order('created_at', { ascending: true });

              if (resultsError || !resultsData || resultsData.length === 0) {
                return {
                  id: thread.id,
                  title: thread.title,
                  timestamp: thread.created_at,
                  query: thread.query,
                  results: [],
                };
              }

              // Check format: if 1 row and it's an array, it's new conversation format
              if (resultsData.length === 1) {
                const data = resultsData[0].result_data;
                
                // Newest format: object with conversation and summaryVersions
                if (data && typeof data === 'object' && data.conversation && data.summaryVersions) {
                  return {
                    id: thread.id,
                    title: thread.title,
                    timestamp: thread.created_at,
                    query: thread.query,
                    results: data.conversation,
                    summaryVersions: data.summaryVersions,
                  };
                }
                
                // New format (before summary versions): result_data is an array of conversation Q&A pairs
                if (Array.isArray(data) && data.length > 0 && data[0]?.query) {
                  return {
                    id: thread.id,
                    title: thread.title,
                    timestamp: thread.created_at,
                    query: thread.query,
                    results: data, // Full conversation thread
                  };
                }
              }

              // Old format: multiple rows, each with individual results
              const results = resultsData.map((r: any) => r.result_data);

              return {
                id: thread.id,
                title: thread.title,
                timestamp: thread.created_at,
                query: thread.query,
                results: results, // Old format results
              };
            })
          );

          setConversations(threadsWithResults as any);
        }
      } catch (error) {
        console.error('Error loading threads:', error);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    loadThreads();
  }, [user]);
  
  // Search results state
  const [searchResults, setSearchResults] = useState<SearchResultsData | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentSearchDocumentIds, setCurrentSearchDocumentIds] = useState<string[]>([]);

  // Conversation thread state - stores history of Q&A
  const [conversationThread, setConversationThread] = useState<SearchResultsData[]>([]);
  const MAX_CONVERSATION_LENGTH = 5;

  // Summary versions state - tracks original + regenerated summaries for each Q&A
  interface SummaryVersions {
    [qaIndex: number]: string[]; // Array of summary versions for each Q&A
  }
  const [summaryVersions, setSummaryVersions] = useState<SummaryVersions>({});
  const [isRegenerating, setIsRegenerating] = useState<{ [qaIndex: number]: boolean }>({});

  // Follow-up conversation state
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  
  // Thread management state
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>(''); // Track final transcript to avoid duplicates
  const startingTextRef = useRef<string>(''); // Track text at start of recording
  const lastInterimRef = useRef<string>(''); // Track last interim to replace it

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

  const handleRemoveRecentSearch = async (index: number) => {
    if (!user) return;
    
    const searchToRemove = recentSearches[index];
    if (!searchToRemove) return;
    
    try {
      // Remove from database
      const { error } = await supabase
        .from('search_queries')
        .delete()
        .eq('user_id', user.id)
        .eq('query', searchToRemove);

      if (error) {
        console.error('Error removing search query:', error);
      } else {
        // Update local state
        setRecentSearches(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error('Error removing search query:', error);
    }
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

  const detectPRDIntent = (_query: string): boolean => {
    // PRD creation via slash command is deprecated; use dashboard button instead
    return false;
  };

  const extractPRDTitle = (query: string): string => {
    return query
      .replace(/^\s*\/prd\s*/i, '')
      .replace(/create prd|new prd|write prd|prd for/gi, '')
      .trim() || 'Untitled PRD';
  };

  const startRecording = async (target: 'search' | 'followup' = 'search') => {
    try {
      const localTarget = target; // capture target for callbacks
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/ogg'
      ];
      const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        
        // Get current text from real-time transcription (if available)
        const currentText = localTarget === 'followup' ? followUpQuery : searchValue;
        
        setIsTranscribing(true);
        try {
          const { text } = await ApiClient.transcribeSpeech(blob);
          // Only update if server transcription is different (more accurate) or if we don't have real-time text
          if (text && text.trim() !== currentText.trim()) {
            if (localTarget === 'followup') {
              setFollowUpQuery(text);
            } else {
              setSearchValue(text);
            }
          }
        } catch (err) {
          console.error('Transcription failed', err);
          // Don't show alert if we already have real-time transcription
          if (!currentText || currentText.trim().length === 0) {
            alert((err as Error).message || 'Transcription failed');
          }
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(t => t.stop());
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Start in-browser live transcription if available (Web Speech API)
      const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          // Capture starting text and reset tracking
          startingTextRef.current = localTarget === 'followup' ? followUpQuery : searchValue;
          finalTranscriptRef.current = '';
          lastInterimRef.current = '';
          
          const recognition = new SpeechRecognition();
          recognition.lang = 'en-US'; // Explicitly set to English
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';
            
            // Process all results since last event
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                final += transcript + ' ';
              } else {
                interim += transcript;
              }
            }
            
            // Update final transcript
            if (final) {
              finalTranscriptRef.current += final;
              lastInterimRef.current = ''; // Clear interim when we get final
            }
            
            // Update interim (replace previous interim)
            if (interim) {
              lastInterimRef.current = interim;
            }
            
            // Update display: starting text + final transcript + current interim
            const displayText = startingTextRef.current + 
              (startingTextRef.current && finalTranscriptRef.current ? ' ' : '') + 
              finalTranscriptRef.current.trim() + 
              (lastInterimRef.current ? ' ' + lastInterimRef.current : '');
            
            if (localTarget === 'followup') {
              setFollowUpQuery(displayText);
            } else {
              setSearchValue(displayText);
            }
          };
          recognition.onerror = (_e: any) => {};
          recognition.onend = () => {
            // When recognition ends, show final transcript (no interim)
            const displayText = startingTextRef.current + 
              (startingTextRef.current && finalTranscriptRef.current ? ' ' : '') + 
              finalTranscriptRef.current.trim();
            if (localTarget === 'followup') {
              setFollowUpQuery(displayText);
            } else {
              setSearchValue(displayText);
            }
          };
          speechRecognitionRef.current = recognition;
          recognition.start();
        } catch (_) {
          // If SpeechRecognition fails, just rely on server transcription
        }
      }
    } catch (e) {
      console.error('Mic error', e);
      alert('Microphone permission denied or unavailable');
    }
  };

  const stopRecording = () => {
    try {
      // Stop speech recognition first to get final transcript
      if (speechRecognitionRef.current) {
        try { 
          speechRecognitionRef.current.stop(); 
          speechRecognitionRef.current = null;
        } catch {}
      }
      // Then stop media recorder
      mediaRecorderRef.current?.stop();
      // Reset for next recording
      finalTranscriptRef.current = '';
      startingTextRef.current = '';
      lastInterimRef.current = '';
    } catch {}
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    if (detectPRDIntent(searchValue)) {
      const title = extractPRDTitle(searchValue);
      setPRDIntent(title);
      setIsPRDMode(true);
      return;
    }
    
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
      
      // Call real search API
      const apiUrl = import.meta.env.DEV ? '' : ((import.meta.env as any).VITE_API_URL || 'https://source-searcher-pro.onrender.com');
      const response = await fetch(`${apiUrl}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          query: searchValue,
          filters: {
            applications: filters.applications,
            authors: filters.authors,
            documentTypes: filters.documentTypes,
            timeRange: filters.timeRange,
            dateRange: filters.dateRange
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429 && errorData.code === 'QUOTA_EXCEEDED') {
          throw new Error('Search temporarily unavailable due to API quota limits. Please try again later.');
        }
        
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const results = await response.json();
      
      // Apply filters to results if any are selected
      let filteredResults = results.results;
      
      if (filters.applications.length > 0) {
        filteredResults = filteredResults.filter((result: any) => 
          filters.applications.includes(result.source)
        );
      }
      
      if (filters.documentTypes.length > 0) {
        filteredResults = filteredResults.filter((result: any) => 
          filters.documentTypes.includes(result.type)
        );
      }
      
      // Apply author filter only if authors are selected (skip for now as requested)
      if (filters.authors.length > 0) {
        filteredResults = filteredResults.filter((result: any) => 
          filters.authors.includes(result.author)
        );
      }
      
      // Update results with filtered data
      results.results = filteredResults;
      results.totalResults = filteredResults.length;
      
      setSearchResults(results);
      
      // Track document IDs for follow-up questions (RAG within these documents)
      const documentIds = results.results.map((result: any) => result.id);
      setCurrentSearchDocumentIds(documentIds);
      
      // Initialize conversation thread with first Q&A
      setConversationThread([results]);
      
      // Initialize summary versions for the first Q&A
      setSummaryVersions({ 0: [results.aiSummary] });
      
      // Save search query to database
      await saveSearchQuery(searchValue);
      
      // Refresh recent searches from database
      await fetchRecentSearches();
    } catch (error) {
      setSearchError('Failed to load search results. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleThreadClick = async (threadId: string) => {
    setSelectedThread(threadId);
    setShowMobileSidebar(false); // Close mobile sidebar when selecting a thread
    
    // Load the conversation thread from the saved thread
    const thread: any = conversations.find(t => t.id === threadId);
    if (thread && thread.results) {
      // Check if results is already an array of conversation items or old format
      if (Array.isArray(thread.results) && thread.results.length > 0) {
        // If first item has 'query' property, it's the new conversation format
        const firstItem: any = thread.results[0];
        if (firstItem && typeof firstItem === 'object' && 'query' in firstItem && 'results' in firstItem) {
          setConversationThread(thread.results as any);
          
          // Restore summary versions if they exist
          if (thread.summaryVersions) {
            setSummaryVersions(thread.summaryVersions);
            console.log(`📖 Loaded thread with ${thread.results.length} Q&A pairs and summary versions`);
          } else {
            console.log(`📖 Loaded thread with ${thread.results.length} Q&A pairs (no summary versions)`);
          }
          
          // Extract document IDs from first search for reference
          if (firstItem.results && Array.isArray(firstItem.results)) {
            const docIds = firstItem.results.map((r: any) => r.id);
            setCurrentSearchDocumentIds(docIds);
          }
          
          // Check if any results have potential_duplicates and refresh if needed
          const hasDuplicates = thread.results.some((result: any) => 
            result.results && result.results.some((r: any) => r.potential_duplicates && r.potential_duplicates.length > 0)
          );
          
          if (hasDuplicates) {
            console.log('🔄 Thread has potential duplicates, refreshing search results...');
            // Refresh the search results to get updated duplicate status
            await handleSearchRetry();
          }
        }
      }
    }
  };

  const handleBackToSearch = async () => {
    // Save current conversation thread if it exists AND it's a new search (not viewing an existing thread)
    const shouldSaveThread = conversationThread.length > 0 && !selectedThread && user;
    
    if (shouldSaveThread) {
      try {
        // Use the first query as the title
        const firstQuery = conversationThread[0].query;
        
        // Create a new thread in the database
        const { data: newThread, error: threadError } = await (supabase as any)
          .from('search_threads')
          .insert({
            user_id: user.id,
            title: firstQuery.substring(0, 100), // Limit title length
            query: firstQuery,
          })
          .select()
          .single();

        if (!threadError && newThread) {
          // Save the ENTIRE conversation thread with summary versions
          // Store as a single JSONB object containing the full conversation
          const threadData = {
            conversation: conversationThread,
            summaryVersions: summaryVersions
          };
          
          await (supabase as any).from('search_thread_results').insert({
            thread_id: newThread.id,
            result_data: threadData, // Save conversation + summary versions
          });

          // Add to local state at the beginning (most recent first)
          const newConversation = {
            id: newThread.id,
            title: newThread.title,
            timestamp: newThread.created_at,
            query: newThread.query,
            results: conversationThread, // Store full conversation
          };

          setConversations((prev) => {
            const updated = [newConversation as any, ...prev];
            // Keep only the 10 most recent threads
            return updated.slice(0, 10);
          });
          console.log(`✅ Thread saved to database with ${conversationThread.length} Q&A pairs and summary versions`);
        }
      } catch (error) {
        console.error('Error saving thread:', error);
      }
    }

    // Clear all states to go back to main search
    setSelectedThread(null);
    setShowSearchResults(false);
    setSearchResults(null);
    setSearchError(null);
    setCurrentSearchDocumentIds([]);
    setConversationThread([]); // Clear conversation thread
    setSummaryVersions({}); // Clear summary versions
    setIsRegenerating({}); // Clear regenerating state
    setSearchValue(''); // Also clear the search input
  };

  const handleNewConversation = () => {
    setSelectedThread(null);
    setShowSearchResults(false);
    setSearchResults(null);
    setSearchError(null);
    setCurrentSearchDocumentIds([]);
    setConversationThread([]); // Clear conversation thread
    setSummaryVersions({}); // Clear summary versions
    setIsRegenerating({}); // Clear regenerating state
    setSearchValue(''); // Clear any existing search
  };

  const handleResultClick = (result: unknown) => {
    // Handle result card click - could open a detailed view or continue conversation
    console.log('Result clicked:', result);
  };

  // Search results handlers
  const handleSearchResultClick = (result: any) => {
    console.log('Search result clicked:', result);
    
    // Skip Slack for now
    if (result.source === 'Slack') {
      console.log('Slack results will be handled later');
      return;
    }
    
    // Open Notion or Google Drive documents in a new tab
    if (result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('No URL found for result:', result);
    }
  };

  const handleSearchRetry = async () => {
    if (searchResults?.query) {
      await handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  // Separate function for refreshing results without creating new search history
  const handleRefreshResults = async () => {
    if (searchResults?.query) {
      try {
        setIsSearchLoading(true);
        setSearchError(null);
        
        const apiUrl = import.meta.env.DEV ? '' : ((import.meta.env as any).VITE_API_URL || 'https://source-searcher-pro.onrender.com');
        const response = await fetch(`${apiUrl}/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            query: searchResults.query,
            filters: {
              applications: filters.applications,
              authors: filters.authors,
              documentTypes: filters.documentTypes,
              timeRange: filters.timeRange,
              dateRange: filters.dateRange
            }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const results = await response.json();
        setSearchResults(results);
        
        // Update the first item in conversation thread without creating new history
        if (conversationThread.length > 0) {
          setConversationThread(prev => [
            results,
            ...prev.slice(1)
          ]);
        }
        
      } catch (error) {
        console.error('Refresh results error:', error);
        setSearchError('Failed to refresh results. Please try again.');
      } finally {
        setIsSearchLoading(false);
      }
    }
  };

  const handleRegenerateSummary = async (qaIndex: number) => {
    // Check if we've already regenerated (max 1 regeneration)
    const versions = summaryVersions[qaIndex] || [];
    if (versions.length >= 2) {
      console.log('⚠️ Maximum regenerations reached for this Q&A');
      return;
    }

    setIsRegenerating(prev => ({ ...prev, [qaIndex]: true }));

    try {
      const qa = conversationThread[qaIndex];
      const apiUrl = import.meta.env.DEV ? '' : ((import.meta.env as any).VITE_API_URL || 'https://source-searcher-pro.onrender.com');
      const response = await fetch(`${apiUrl}/api/regenerate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          query: qa.query,
          results: qa.results,
        }),
      });

      if (!response.ok) {
        throw new Error(`Summary regeneration failed: ${response.statusText}`);
      }

      const { aiSummary } = await response.json();

      // Add new summary version
      setSummaryVersions(prev => ({
        ...prev,
        [qaIndex]: [...(prev[qaIndex] || []), aiSummary]
      }));

      // Update the conversation thread with new summary
      setConversationThread(prev => 
        prev.map((item, idx) => 
          idx === qaIndex ? { ...item, aiSummary } : item
        )
      );

      console.log(`✨ Summary regenerated for Q&A ${qaIndex + 1}`);
    } catch (error) {
      console.error('Error regenerating summary:', error);
    } finally {
      setIsRegenerating(prev => ({ ...prev, [qaIndex]: false }));
    }
  };

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;
    
    setIsFollowUpLoading(true);
    
    try {
      if (selectedThread) {
        // Handle follow-up in conversation thread
        const thread = conversations.find(t => t.id === selectedThread);
        if (thread) {
          console.log('Follow-up question in conversation:', followUpQuery);
          // In a real app, this would make an API call to process the follow-up
          // For now, we'll just show a success message
        }
      } else if (searchResults && currentSearchDocumentIds.length > 0) {
        // Check if we've reached the conversation limit
        if (conversationThread.length >= MAX_CONVERSATION_LENGTH) {
          setSearchError(`You've reached the limit of ${MAX_CONVERSATION_LENGTH} questions per thread. Start a new search to continue.`);
          setIsFollowUpLoading(false);
          return;
        }
        
        // Handle follow-up in search results - search WITHIN already found documents (RAG)
        setSearchError(null);
        
        try {
          console.log('🔍 Follow-up search within', currentSearchDocumentIds.length, 'documents');
          
          const apiUrl = import.meta.env.DEV ? '' : ((import.meta.env as any).VITE_API_URL || 'https://source-searcher-pro.onrender.com');
          const response = await fetch(`${apiUrl}/api/search/followup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              query: followUpQuery,
              documentIds: currentSearchDocumentIds,
            }),
          });

          if (!response.ok) {
            throw new Error(`Follow-up search failed: ${response.statusText}`);
          }

          const results = await response.json();
          
          // APPEND to conversation thread instead of replacing
          const newIndex = conversationThread.length;
          setConversationThread(prev => [...prev, results]);
          setSearchResults(results); // Keep for compatibility
          
          // Initialize summary versions for this new Q&A
          setSummaryVersions(prev => ({
            ...prev,
            [newIndex]: [results.aiSummary]
          }));
          
          // Keep document IDs the SAME (search within same documents)
          // Don't update document IDs - we want to stay within the original set
          console.log(`📝 Conversation: ${conversationThread.length + 1}/${MAX_CONVERSATION_LENGTH} questions`);
        } catch (error) {
          setSearchError('Failed to process follow-up question. Please try again.');
          console.error('Follow-up search error:', error);
        }
      }
      
      setFollowUpQuery('');
    } catch (error) {
      console.error('Follow-up error:', error);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    try {
      // Update in database
      const { error } = await (supabase as any)
        .from('search_threads')
        .update({ title: newTitle })
        .eq('id', threadId);

      if (!error) {
        // Update local state
        setConversations(prev => 
          prev.map(thread => 
            thread.id === threadId ? { ...thread, title: newTitle } : thread
          )
        );
        console.log('✅ Thread renamed in database');
      }
    } catch (error) {
      console.error('Error renaming thread:', error);
    }
    
    setEditingThread(null);
    setEditTitle('');
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      // Delete from database (CASCADE will delete associated results)
      const { error } = await (supabase as any)
        .from('search_threads')
        .delete()
        .eq('id', threadId);

      if (!error) {
        // Update local state
        setConversations(prev => prev.filter(thread => thread.id !== threadId));
        if (selectedThread === threadId) {
          setSelectedThread(null);
        }
        console.log('✅ Thread deleted from database');
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Format time as HH:MM AM/PM
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Check if it's today
    if (dateOnly.getTime() === today.getTime()) {
      return `Today at ${timeStr}`;
    }
    
    // Check if it's yesterday
    if (dateOnly.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeStr}`;
    }
    
    // Check if it's this year
    if (date.getFullYear() === now.getFullYear()) {
      const monthDay = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      return `${monthDay} at ${timeStr}`;
    }
    
    // For older dates, include the year
    const fullDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    return `${fullDate} at ${timeStr}`;
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

  // Helper to get individual results from thread (handles both old and new formats)
  const getThreadResultsForDisplay = (thread: any) => {
    if (!thread.results || thread.results.length === 0) return [];
    
    const firstItem = thread.results[0];
    
    // New conversation format: array of SearchResultsData
    if (firstItem && typeof firstItem === 'object' && 'query' in firstItem && 'results' in firstItem) {
      // Flatten all results from all Q&A pairs
      return thread.results.flatMap((qa: any) => qa.results || []);
    }
    
    // Old format: array of individual results
    return thread.results;
  };

  // Get result count for thread
  const getThreadResultCount = (thread: any) => {
    const results = getThreadResultsForDisplay(thread);
    return results.length;
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
        {/* Sidebar Header - Enhanced (reduced top padding to remove visual gap) */}
        <div className={`border-b border-border/20 bg-gradient-to-r from-card/40 to-transparent ${sidebarCollapsed ? 'p-3 lg:p-3' : 'p-3'}`}>
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
                className="h-10 w-10 p-0 rounded-xl border-primary/30 hover:border-primary/60 hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/10 hover:scale-110 hover:shadow-lg hover:shadow-primary/25 transition-all duration-500 group relative overflow-hidden"
                title="New Conversation"
                onClick={handleNewConversation}
              >
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                
                {/* Plus icon with dynamic effects */}
                <Plus className="w-4 h-4 group-hover:text-primary transition-all duration-500 group-hover:rotate-90 relative z-10" />
                
                {/* Floating particles effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-1 left-1 w-1 h-1 bg-primary/60 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                  <div className="absolute top-2 right-2 w-0.5 h-0.5 bg-accent/60 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                  <div className="absolute bottom-2 left-2 w-0.5 h-0.5 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 transition-all duration-500 group relative overflow-hidden">
                    {/* Animated shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                    
                    <span className="text-foreground dark:text-white font-bold text-lg relative z-10 group-hover:scale-110 transition-transform duration-300">
                      H7
                    </span>
                    
                    {/* Floating particles effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute top-1 left-1 w-0.5 h-0.5 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                      <div className="absolute top-2 right-1 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                      <div className="absolute bottom-1 right-2 w-0.5 h-0.5 bg-white/50 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground group hover:cursor-pointer relative animate-subtle-glow">
                        <span className="relative z-10 hover:bg-gradient-to-r hover:from-primary hover:via-accent hover:to-primary hover:bg-clip-text hover:text-transparent transition-all duration-700">
                          Haven7
                        </span>
                        {/* Flowing color overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm -m-1" />
                        {/* Animated underline */}
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-accent w-0 group-hover:w-full transition-all duration-1000 ease-out" />
                      </h2>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-medium">
                        BETA
                      </Badge>
                    </div>
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
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/5 hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 py-3 rounded-xl border-border/50 group relative overflow-hidden"
                onClick={handleNewConversation}
              >
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                
                {/* Plus icon with rotation */}
                <Plus className="w-4 h-4 group-hover:text-primary group-hover:rotate-90 transition-all duration-500 relative z-10" />
                
                {/* Text with flowing color */}
                <span className="relative z-10 transition-all duration-500 text-foreground group-hover:text-primary-foreground dark:group-hover:text-white">
                  New Conversation
                </span>
                
                {/* Floating accent dots */}
                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-ping" />
                </div>
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
                            {getThreadResultsForDisplay(thread).slice(0, 3).map((result: any, idx: number) => (
                              <div
                                key={idx}
                                className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-xs font-medium"
                                title={result?.source || 'Unknown'}
                              >
                                {result?.source?.charAt(0) || '?'}
                              </div>
                            ))}
                            {getThreadResultCount(thread) > 3 && (
                              <div className="w-5 h-5 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center text-xs font-medium">
                                +{getThreadResultCount(thread) - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getThreadResultCount(thread)} result{getThreadResultCount(thread) !== 1 ? 's' : ''}
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
            <span className="text-xl font-semibold text-foreground leading-none group hover:cursor-pointer relative animate-subtle-glow">
              <span className="relative z-10 hover:bg-gradient-to-r hover:from-primary hover:via-accent hover:to-primary hover:bg-clip-text hover:text-transparent transition-all duration-700">
                Haven7
              </span>
              {/* Flowing color overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm -m-1" />
              {/* Animated underline */}
              <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-accent w-0 group-hover:w-full transition-all duration-1000 ease-out" />
            </span>
          </div>
          
          {/* Right section: Theme toggle, PRD Studio, Profile */}
          <div className="flex items-center gap-4 pr-6">
            <button
              onClick={() => navigate('/prd/new')}
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/[0.08] px-5 py-2 text-sm font-semibold text-white/80 shadow-[0_12px_30px_rgba(144,96,255,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12] hover:text-white"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-white/70" />
                PRD Studio
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </button>
            <ThemeToggle />
            {/* User avatar with dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full p-0 bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-200 flex items-center justify-center"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      key={profileData?.avatar_url || 'no-avatar'}
                      src={profileData?.avatar_url || ''} 
                      alt={profileData?.name || 'User'} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profileData?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-card/95 backdrop-blur-sm border border-border/50 z-[9999] shadow-lg"
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
                    console.log('🔗 Navigating to profile-settings from dropdown');
                    navigate('/profile-settings');
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
        <div className={`flex-1 relative ${showSearchResults || selectedThread ? 'overflow-y-auto' : 'flex items-center justify-center'} p-4 lg:p-6`}>
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

            {conversationThread.length > 0 ? (
              <>
                {/* Display all Q&A pairs in the conversation */}
                {conversationThread.map((qa, index) => (
                  <div key={index} className="mb-8">
                    {/* Question Header */}
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          Question {index + 1}: {qa.query}
                        </span>
                      </div>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Initial Search
                        </Badge>
                      )}
                      {index > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Follow-up {index}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Results */}
                    <SearchResults
                      data={qa}
                      isLoading={false}
                      onResultClick={handleSearchResultClick}
                      onRetry={!selectedThread && index === 0 ? handleRefreshResults : undefined}
                      hasMore={false}
                      summaryVersions={summaryVersions[index]}
                      onRegenerateSummary={() => handleRegenerateSummary(index)}
                      isRegeneratingSummary={isRegenerating[index]}
                      canRegenerateSummary={!summaryVersions[index] || summaryVersions[index].length < 2}
                      isClosedThread={false}
                      parentFilters={{
                        applications: filters.applications,
                        documentTypes: filters.documentTypes
                      }}
                    />
                  </div>
                ))}
                
                {/* Follow-up Input for Search Results - Enhanced */}
                {conversationThread.length < MAX_CONVERSATION_LENGTH && (
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
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => (isRecording ? stopRecording() : startRecording('followup'))}
                            disabled={isTranscribing}
                            className={`p-2 ${isRecording ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground hover:text-foreground'}`}
                            title={isRecording ? 'Stop recording' : 'Click to record'}
                          >
                            {isRecording ? (
                              <Square className="w-4 h-4 animate-pulse" />
                            ) : isTranscribing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mic className="w-4 h-4" />
                            )}
                          </Button>
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
                        <div className="mt-2 text-center text-xs text-muted-foreground">
                          Question {conversationThread.length} of {MAX_CONVERSATION_LENGTH}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                )}
                
                {/* Limit reached message */}
                {conversationThread.length >= MAX_CONVERSATION_LENGTH && (
                  <div className="mt-8 p-6 bg-secondary/20 border border-border/50 rounded-xl text-center">
                    <p className="text-muted-foreground mb-3">
                      You've reached the limit of {MAX_CONVERSATION_LENGTH} questions in this conversation.
                    </p>
                    <Button onClick={handleNewConversation} variant="default">
                      Start New Search
                    </Button>
                  </div>
                )}
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
        ) : selectedThread && conversationThread.length > 0 ? (
          <div className="w-full relative z-10 pb-8">
            {/* Display saved conversation thread */}
            {conversationThread.map((qa, index) => (
              <div key={index} className="mb-8">
                {/* Question Header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Question {index + 1}: {qa.query}
                    </span>
                  </div>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Initial Search
                    </Badge>
                  )}
                  {index > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Follow-up {index}
                    </Badge>
                  )}
                </div>
                
                {/* Results - For saved threads, disable regeneration */}
                <SearchResults
                  data={qa}
                  isLoading={false}
                  onResultClick={handleSearchResultClick}
                  onRetry={handleRefreshResults}
                  hasMore={false}
                  summaryVersions={summaryVersions[index]}
                  isClosedThread={true}
                  parentFilters={{
                    applications: filters.applications,
                    documentTypes: filters.documentTypes
                  }}
                />
              </div>
            ))}
            
            {/* Info message for saved threads */}
            <div className="mt-8 p-6 bg-secondary/20 border border-border/50 rounded-xl text-center">
              <p className="text-muted-foreground mb-3">
                This is a saved conversation with {conversationThread.length} question{conversationThread.length > 1 ? 's' : ''}.
              </p>
              <Button onClick={handleNewConversation} variant="default">
                Start New Search
              </Button>
            </div>
          </div>
        ) : selectedThread ? (
          <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 relative z-10">
            {/* Conversation Header - Legacy view for old threads */}
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
                      {/* Enhanced source badge */}
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          result.source === 'slack' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : result.source === 'notion' 
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                      >
                        {result.source === 'slack' && '💬'} 
                        {result.source === 'notion' && '📝'} 
                        {result.source === 'google_drive' && '📁'} 
                        {result.source}
                      </Badge>
                      
                      {/* Author badge with enhanced styling */}
                      <Badge variant="outline" className="text-xs bg-background/50">
                        👤 {result.author}
                      </Badge>
                      
                      {/* Message type indicator for Slack */}
                      {result.source === 'slack' && (result as any).message_type && (result as any).message_type !== 'general' && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            (result as any).message_type === 'question' 
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : (result as any).message_type === 'decision'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : (result as any).message_type === 'blocker'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {(result as any).message_type === 'question' && '❓'} 
                          {(result as any).message_type === 'decision' && '✅'} 
                          {(result as any).message_type === 'blocker' && '🚫'} 
                          {(result as any).message_type === 'status_update' && '📊'} 
                          {(result as any).message_type === 'review_request' && '👀'} 
                          {(result as any).message_type}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(result.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground/90 mb-2 group-hover:text-foreground transition-colors">
                    {result.content}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                    {/* Slack message display */}
                    {result.source === 'slack' && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full">
                          <MessageSquare className="w-3 h-3" />
                          <span className="font-medium">#{result.channel}</span>
                        </div>
                        {(result as any).has_thread && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{(result as any).reply_count} replies</span>
                          </div>
                        )}
                        {(result as any).participants && (result as any).participants.length > 1 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Users className="w-3 h-3" />
                            <span>{(result as any).participants.length} people</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Notion page display */}
                    {result.source === 'notion' && result.page && (
                      <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        <FileText className="w-3 h-3" />
                        <span>{result.page}</span>
                      </div>
                    )}
                    
                    {/* Google Drive file display */}
                    {result.source === 'google_drive' && result.filename && (
                      <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <FileText className="w-3 h-3" />
                        <span>{result.filename}</span>
                      </div>
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
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => (isRecording ? stopRecording() : startRecording('followup'))}
                        disabled={isTranscribing}
                        className={`p-2 ${isRecording ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground hover:text-foreground'}`}
                        title={isRecording ? 'Stop recording' : 'Click to record'}
                      >
                        {isRecording ? (
                          <Square className="w-4 h-4 animate-pulse" />
                        ) : isTranscribing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </Button>
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
            {/* Empty State Banner - Show when no connections */}
            {!isCheckingConnections && hasConnections === false && (
              <div className="w-full animate-in fade-in-0 slide-in-from-top-4 duration-500">
                <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Connect Your Data Sources to Get Started
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You haven't connected any data sources yet. Connect Slack, Google Drive, or Notion to start searching across your content.
                    </p>
                    <Button
                      onClick={() => navigate('/connected-sources')}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Connect Sources
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHasConnections(null)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Heading and tagline */}
            <div className="text-center space-y-4 animate-fade-in">
              <h1 className="text-3xl lg:text-5xl font-light text-foreground tracking-tight group hover:cursor-pointer">
                <span className="relative inline-block">
                  <span className="relative z-10">Your Work,</span>
                  <span className="relative z-10 ml-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent hover:animate-pulse transition-all duration-500">
                    Connected
                  </span>
                  {/* Flowing color overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm -m-2" />
                  {/* Animated underline */}
                  <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-accent w-0 group-hover:w-full transition-all duration-1000 ease-out" />
                </span>
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
                  placeholder="Search across your workspace…"
                  className="flex-1 border-0 bg-transparent text-sm sm:text-base md:text-lg lg:text-xl placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 font-light"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => (isRecording ? stopRecording() : startRecording('search'))}
                  disabled={isTranscribing}
                  className={`p-2 ${isRecording ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground hover:text-foreground'}`}
                  title={isRecording ? 'Stop recording' : 'Click to record'}
                >
                  {isRecording ? (
                    <Square className="w-4 h-4 lg:w-5 lg:h-5 animate-pulse" />
                  ) : isTranscribing ? (
                    <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4 lg:w-5 lg:h-5" />
                  )}
                </Button>
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
        {isPRDMode && prdIntent && (
          <PRDBuilder
            initialTitle={prdIntent}
            onClose={() => {
              setIsPRDMode(false);
              setPRDIntent(null);
            }}
          />
        )}
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-muted-foreground/80 font-medium">Recent searches</p>
          <div className="flex flex-wrap gap-3">
            {recentSearches.length > 0 ? (
              recentSearches.map((search, index) => (
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">No recent searches yet</p>
            )}
          </div>
        </div>

        {/* Connected sources */}
            <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60 group">
                <span className="font-medium group-hover:text-foreground transition-colors duration-300">Connected sources:</span>
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

      {/* Floating Contact Support Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group relative"
              size="icon"
              aria-label="Get Help"
              title="Get Help"
            >
              <svg 
                className="w-10 h-10 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H6L8 20L10 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                <circle cx="16" cy="8" r="1.2" fill="currentColor" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="end" 
            className="w-52 bg-card/95 backdrop-blur-sm border border-border/50 shadow-2xl animate-in slide-in-from-bottom-2 fade-in-0 zoom-in-95 duration-300"
            sideOffset={8}
          >
            <DropdownMenuItem 
              onClick={() => window.open('mailto:saiashishpalai74@gmail.com?subject=Haven7%20Support%20Request', '_blank')}
              className="cursor-pointer hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] focus:bg-accent/50 focus:scale-[1.02] group"
            >
              <MessageSquare className="mr-3 h-4 w-4 text-blue-500 group-hover:text-blue-600 transition-colors duration-200" />
              <span className="font-medium">Contact Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => window.open('mailto:saiashishpalai74@gmail.com?subject=Haven7%20Feature%20Request', '_blank')}
              className="cursor-pointer hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] focus:bg-accent/50 focus:scale-[1.02] group"
            >
              <Lightbulb className="mr-3 h-4 w-4 text-yellow-500 group-hover:text-yellow-600 transition-colors duration-200" />
              <span className="font-medium">Feature Request</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SearchInterface;