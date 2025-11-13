import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, Pin, Loader2, RotateCcw, Plus, Mic, Square, FileText, Edit, Save, Settings, Clock, Folder, ChevronRight, ChevronLeft, Menu, ShieldCheck, AlertTriangle, HelpCircle, Image } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { ApiClient } from '@/lib/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import nlp from 'compromise';
import { cn } from '@/lib/utils';
import { WireframeUpload } from '@/components/WireframeUpload';
import { analytics } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';

type SectionId =
  | 'objective'
  | 'background'
  | 'scope'
  | 'requirements'
  | 'metrics'
  | 'dependencies'
  | 'timeline';

const PRD_QUESTIONS: Array<{ id: SectionId; question: string; placeholder: string; contextQuery: string }> = [
  {
    id: 'objective',
    question: 'What problem are you solving?',
    placeholder: 'Describe the user pain point and why it matters...',
    contextQuery: 'problem goal objective issue pain point',
  },
  {
    id: 'background',
    question: 'What context or history is important?',
    placeholder: 'Share relevant context:\n- Origin story or trigger\n- Prior attempts\n- Customer feedback or data points',
    contextQuery: 'background history rationale context narrative',
  },
  {
    id: 'scope',
    question: 'What is in scope vs. out of scope?',
    placeholder:
      'Define clear boundaries:\n\nIn scope:\n- Feature A\n- Feature B\n\nOut of scope:\n- Feature C',
    contextQuery: 'scope MVP requirements features excluded',
  },
  {
    id: 'requirements',
    question: 'What must this solution deliver?',
    placeholder:
      'Outline functional or experience needs:\n- Must do X\n- Should handle Y\n- Consider Z',
    contextQuery: 'requirement capability user story acceptance criteria',
  },
  {
    id: 'metrics',
    question: 'How will you measure success?',
    placeholder: 'List quantifiable KPIs:\n- Metric 1: Target value\n- Metric 2: Target value',
    contextQuery: 'KPI metric goal target success measurement',
  },
  {
    id: 'dependencies',
    question: 'What dependencies or constraints exist?',
    placeholder:
      'Technical or organizational blockers:\n- Depends on X\n- Blocked by Y\n- Constraint Z',
    contextQuery: 'integration depends on compatibility blocked constraint',
  },
  {
    id: 'timeline',
    question: 'What is the timeline?',
    placeholder: 'Key milestones:\n- Week 1: X\n- Week 4: Y\n- Week 8: Launch',
    contextQuery: 'milestone release timeline deadline launch',
  },
];

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface GeneratedSection {
  number: number;
  title: string;
  confidence_percent: number;
  content?: string;
  confidence_rationale?: string;
  needs_validation?: string[];
  requires_input?: string[];
  missing_context?: string;
  context_sources?: string[];
}

interface GenerationSummary {
  total_sections?: number;
  complete_sections?: number;
  needs_validation_sections?: number;
  requires_input_sections?: number;
  context_sources?: {
    user_sections?: number;
    workspace_chunks?: {
      count?: number;
      details?: string[];
    };
    best_practices_sections?: number;
  };
  next_steps?: string[];
}

interface AssembledPRDResult {
  prd_text: string;
  sections: GeneratedSection[];
  summary?: GenerationSummary;
}

const CONFIDENCE_META: Record<
  ConfidenceLevel,
  {
    label: string;
    Icon: typeof ShieldCheck;
    badgeClass: string;
    containerClass: string;
  }
> = {
  high: {
    label: 'High confidence',
    Icon: ShieldCheck,
    badgeClass: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    containerClass: 'border border-emerald-500/20 bg-emerald-500/5',
  },
  medium: {
    label: 'Needs validation',
    Icon: AlertTriangle,
    badgeClass: 'border border-amber-400/40 bg-amber-400/10 text-amber-200',
    containerClass: 'border border-amber-400/25 bg-amber-400/5',
  },
  low: {
    label: 'Requires input',
    Icon: HelpCircle,
    badgeClass: 'border border-rose-400/40 bg-rose-500/10 text-rose-200',
    containerClass: 'border border-rose-400/25 bg-rose-500/5',
  },
};

const SECTION_NUMBER_TO_ID: Partial<Record<number, SectionId>> = {
  1: 'objective',
  2: 'background',
  3: 'scope',
  4: 'requirements',
  5: 'metrics',
  11: 'dependencies',
  14: 'timeline',
};

const parseSectionsFromMarkdown = (markdown: string): GeneratedSection[] => {
  if (!markdown) return [];
  const pattern = /\*\*(\d+)\.\s*([^*]+?)\*\*\s*\n\s*\n([\s\S]+?)(?=\n\s*\n\*\*\d+\.|$)/g;
  const fallbackSections: GeneratedSection[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    const number = Number(match[1]);
    const title = match[2].trim();
    const content = match[3].trim();
    fallbackSections.push({
      number,
      title,
      content,
      confidence_percent: 90,
      confidence_rationale: 'Parsed from markdown fallback.',
      needs_validation: [],
      requires_input: [],
      missing_context: '',
      context_sources: ['Markdown output'],
    });
  }

  return fallbackSections;
};

const buildSummaryFromSections = (sections: GeneratedSection[], computeLevel: (percent: number) => ConfidenceLevel): GenerationSummary => {
  const counts = sections.reduce(
    (acc, section) => {
      const level = computeLevel(section.confidence_percent ?? 0);
      acc[level] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 } as Record<ConfidenceLevel, number>
  );

  const nextSteps: string[] = [];
  if (counts.low > 0) {
    nextSteps.push('Fill sections marked as requiring input.');
  }
  if (counts.medium > 0) {
    nextSteps.push('Review sections flagged for validation.');
  }

  return {
    total_sections: sections.length,
    complete_sections: counts.high,
    needs_validation_sections: counts.medium,
    requires_input_sections: counts.low,
    context_sources: {
      user_sections: 0,
      workspace_chunks: { count: 0, details: [] },
      best_practices_sections: 0,
    },
    next_steps: nextSteps,
  };
};

const HERO_PROMPT = 'Objective: Clarify the opportunity, the why, and the conviction behind it.';

type PRDStatus = 'draft' | 'published' | 'archived';

interface PRDSidebarItem {
  id: string;
  title: string;
  version: number;
  status: PRDStatus;
  updated_at: string;
  version_group_id?: string;
}

interface PRDGroupSummary {
  groupId: string;
  title: string;
  latestVersion: PRDSidebarItem | null;
  totalVersions: number;
  updatedAt: string | null;
}

export default function PRDNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled PRD');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<SectionId, string>>({
    objective: '',
    background: '',
    scope: '',
    requirements: '',
    metrics: '',
    dependencies: '',
    timeline: '',
  });
  const [prdId, setPrdId] = useState<string | null>(null);
  const [contextSuggestions, setContextSuggestions] = useState<any[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [pinnedChunks, setPinnedChunks] = useState<Set<string>>(new Set());
  const [pinnedChunksGlobal, setPinnedChunksGlobal] = useState<Set<string>>(new Set()); // Accumulated across all sections
  const [priorAnswerSummaries, setPriorAnswerSummaries] = useState<string[]>([]); // Prior answer snippets
  const [useAccumulatedContext, setUseAccumulatedContext] = useState(true); // Toggle for iterative grounding
  const [useDependencyHints, setUseDependencyHints] = useState(true); // Toggle for cross-question hints
  const [dependencyHints, setDependencyHints] = useState<{ terms: string[]; entities: string[]; dates: string[] }>({ terms: [], entities: [], dates: [] });
  const [consecutiveLowResults, setConsecutiveLowResults] = useState(0); // Track for auto-clear
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentQueryHash, setCurrentQueryHash] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<'insert' | 'replace'>('replace');
  const [sectionCitations, setSectionCitations] = useState<Record<SectionId, string[]>>({
    objective: [],
    background: [],
    scope: [],
    requirements: [],
    metrics: [],
    dependencies: [],
    timeline: [],
  });
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [exitError, setExitError] = useState('');
  const [assembledPRD, setAssembledPRD] = useState<AssembledPRDResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyError, setAssemblyError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [typedHeroLine, setTypedHeroLine] = useState('');
  const [recentPRDs, setRecentPRDs] = useState<PRDSidebarItem[]>([]);
  const [prdGroups, setPrdGroups] = useState<PRDGroupSummary[]>([]);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [uploadedWireframe, setUploadedWireframe] = useState<{ file: File; preview: string; storageUrl?: string; storagePath?: string } | null>(null);
  const [isGeneratingFromWireframe, setIsGeneratingFromWireframe] = useState(false);
  const { toast } = useToast();

  const getConfidenceLevel = useCallback((percent: number): ConfidenceLevel => {
    if (percent >= 70) return 'high';
    if (percent >= 50) return 'medium';
    return 'low';
  }, []);

  const handleReturnToSection = useCallback(
    (sectionNumber: number) => {
      const targetId = SECTION_NUMBER_TO_ID[sectionNumber];
      if (!targetId) {
        setShowPreviewModal(false);
        return;
      }
      const targetIndex = PRD_QUESTIONS.findIndex((q) => q.id === targetId);
      if (targetIndex >= 0) {
        setShowPreviewModal(false);
        setTimeout(() => {
          setCurrentStep(targetIndex);
        }, 0);
      } else {
        setShowPreviewModal(false);
      }
    },
    [setShowPreviewModal, setCurrentStep]
  );

  const confidenceCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    (assembledPRD?.sections || []).forEach((section) => {
      const level = getConfidenceLevel(section?.confidence_percent ?? 0);
      counts[level] += 1;
    });
    return counts;
  }, [assembledPRD, getConfidenceLevel]);

  const summaryComplete = assembledPRD?.summary?.complete_sections ?? confidenceCounts.high;
  const summaryNeedsValidation =
    assembledPRD?.summary?.needs_validation_sections ?? confidenceCounts.medium;
  const summaryRequiresInput =
    assembledPRD?.summary?.requires_input_sections ?? confidenceCounts.low;
  const totalSectionsGenerated =
    assembledPRD?.summary?.total_sections ?? (assembledPRD?.sections?.length ?? 0);
  const summaryNextSteps = assembledPRD?.summary?.next_steps ?? [];
  const summaryContextSources = assembledPRD?.summary?.context_sources;

  const loadSidebarData = useCallback(async () => {
    setIsSidebarLoading(true);
    setSidebarError(null);
    try {
      const [recentResponse, listResponse] = await Promise.all([
        ApiClient.getRecentPRDs().catch(() => ({ prds: [] })),
        ApiClient.listPRDs().catch(() => ({ prds: [] })),
      ]);

      const recent = (recentResponse?.prds || []) as PRDSidebarItem[];
      setRecentPRDs(recent.slice(0, 6));

      const all = (listResponse?.prds || []) as PRDSidebarItem[];
      const groupedMap = new Map<string, PRDSidebarItem[]>();
      all.forEach(prd => {
        const groupId = prd.version_group_id || prd.id;
        const current = groupedMap.get(groupId) || [];
        current.push(prd);
        groupedMap.set(groupId, current);
      });

      const groups: PRDGroupSummary[] = Array.from(groupedMap.entries()).map(([groupId, versions]) => {
        const sorted = [...versions].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        const latest = sorted[0] || null;
        return {
          groupId,
          title: latest?.title || 'Untitled PRD',
          latestVersion: latest,
          totalVersions: sorted.length,
          updatedAt: latest?.updated_at || null,
        };
      }).sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      setPrdGroups(groups);
    } catch (error: any) {
      setSidebarError(error?.message || 'Failed to load PRDs');
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSidebarData();
  }, [loadSidebarData]);

  const formatGroupTimestamp = (date?: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>(''); // Track final transcript to avoid duplicates
  const startingTextRef = useRef<string>(''); // Track text at start of recording
  const lastInterimRef = useRef<string>(''); // Track last interim to replace it
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hybridTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const current = useMemo(() => PRD_QUESTIONS[currentStep], [currentStep]);

  // Helper: Truncate text at last full stop before 300 chars
  const truncateAtLastPeriod = (text: string, maxChars: number = 300): string => {
    if (text.length <= maxChars) return text;
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > maxChars * 0.5) { // Only use if period is in second half
      return truncated.substring(0, lastPeriod + 1);
    }
    return truncated; // Fallback to hard cut
  };

  // Helper: Get prior answer summaries (capped at 4, max 320 chars each)
  // Memoize to avoid recalculating on every render
  const priorAnswerSummariesMemo = useMemo(() => {
    const summaries: string[] = [];
    for (let i = 0; i < currentStep; i++) {
      const sectionId = PRD_QUESTIONS[i].id;
      const answer = answers[sectionId]?.trim();
      if (answer && answer.length > 0) {
        const summary = truncateAtLastPeriod(answer, 320);
        summaries.push(summary);
      }
    }
    return summaries.slice(0, 4); // Cap at 4
  }, [currentStep, answers]);

  // Helper: Extract dependency hints from prior answers
  const extractDependencyHints = (): { terms: string[]; entities: string[]; dates: string[] } => {
    const allPriorText = [];
    for (let i = 0; i < currentStep; i++) {
      const sectionId = PRD_QUESTIONS[i].id;
      const answer = answers[sectionId]?.trim();
      if (answer && answer.length > 0) {
        allPriorText.push(answer);
      }
    }
    
    if (allPriorText.length === 0) {
      return { terms: [], entities: [], dates: [] };
    }

    const combinedText = allPriorText.join(' ');
    const terms: Set<string> = new Set();
    const entities: Set<string> = new Set();
    const dates: Set<string> = new Set();

    try {
      // Use compromise for entity extraction
      const doc = nlp(combinedText);
      
      // Extract noun phrases (terms)
      const nouns = doc.nouns().out('array');
      nouns.forEach(noun => {
        const cleaned = noun.toLowerCase().trim();
        if (cleaned.length > 2 && cleaned.length < 30) {
          terms.add(cleaned);
        }
      });

      // Extract proper nouns (entities) - product/feature names
      const properNouns = doc.match('#ProperNoun+').out('array');
      properNouns.forEach(entity => {
        const cleaned = entity.trim();
        if (cleaned.length > 1 && cleaned.length < 40) {
          entities.add(cleaned);
        }
      });

      // Extract dates
      const dateMatches = doc.match('#Date+').out('array');
      dateMatches.forEach(dateStr => {
        try {
          // Try to normalize to ISO format
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            dates.add(date.toISOString().split('T')[0]); // YYYY-MM-DD
          }
        } catch {
          // Fallback: keep original if parsing fails
          dates.add(dateStr);
        }
      });

      // Fallback heuristics for entities (capitalized words + 2-gram)
      const words = combinedText.split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const word = words[i];
        const nextWord = words[i + 1];
        if (word[0] && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase() &&
            nextWord[0] && nextWord[0] === nextWord[0].toUpperCase() && nextWord[0] !== nextWord[0].toLowerCase()) {
          const entity = `${word} ${nextWord}`.trim();
          if (entity.length > 2 && entity.length < 40) {
            entities.add(entity);
          }
        }
      }

      // Extract common date patterns (Q1, Q2, next quarter, etc.)
      const quarterPattern = /Q[1-4]\s*\d{4}|\d{4}\s*Q[1-4]|next quarter|this quarter|last quarter/gi;
      const quarterMatches = combinedText.match(quarterPattern);
      if (quarterMatches) {
        quarterMatches.forEach(match => {
          dates.add(match.toLowerCase());
        });
      }

    } catch (error) {
      console.warn('Hint extraction error (falling back to heuristics):', error);
      // Fallback: simple word extraction
      const words = combinedText.split(/\s+/);
      words.forEach(word => {
        const cleaned = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleaned.length > 3 && cleaned.length < 20) {
          terms.add(cleaned);
        }
      });
    }

    // Apply caps and dedupe
    return {
      terms: Array.from(terms).slice(0, 10),
      entities: Array.from(entities).slice(0, 6),
      dates: Array.from(dates).slice(0, 6)
    };
  };

  // Memoize dependency hints
  const dependencyHintsMemo = useMemo(() => {
    if (!useDependencyHints || currentStep === 0) {
      return { terms: [], entities: [], dates: [] };
    }
    return extractDependencyHints();
  }, [currentStep, answers, useDependencyHints]);

  const dependencyHintSummary = useMemo(() => {
    const termCount = dependencyHintsMemo.terms.length;
    const entityCount = dependencyHintsMemo.entities.length;
    const dateCount = dependencyHintsMemo.dates.length;
    const total = termCount + entityCount + dateCount;

    if (total === 0) {
      return '';
    }

    const parts: string[] = [];
    if (termCount) parts.push(`${termCount} ${termCount === 1 ? 'term' : 'terms'}`);
    if (entityCount) parts.push(`${entityCount} ${entityCount === 1 ? 'entity' : 'entities'}`);
    if (dateCount) parts.push(`${dateCount} ${dateCount === 1 ? 'date' : 'dates'}`);

    return `Currently tracking ${parts.join(', ')}`;
  }, [dependencyHintsMemo]);

  useEffect(() => {
    if (hasStarted) {
      setTypedHeroLine('');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    setTypedHeroLine('');
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setTypedHeroLine(HERO_PROMPT.slice(0, index));
      if (index >= HERO_PROMPT.length) {
        window.clearInterval(interval);
      }
    }, 55);

    return () => {
      window.clearInterval(interval);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted || typeof window === 'undefined') return;
    const timeout = window.setTimeout(() => {
      document.getElementById('prd-builder-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [hasStarted]);

  // Create PRD draft once the flow begins
  useEffect(() => {
    if (!hasStarted) return;
    (async () => {
      try {
        const { prd } = await ApiClient.createPRD(title);
        setPrdId(prd.id);
        await loadSidebarData();
      } catch (e) {
        // no-op: surface via UI if needed
      }
    })();
  }, [hasStarted, title, loadSidebarData]);

  // Debounced dual-phase search based on user input
  useEffect(() => {
    if (!hasStarted) {
      return;
    }
    const currentAnswer = answers[current.id] || '';
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if user has typed something (minimum 3 chars) and we have a PRD ID
    if (!currentAnswer.trim() || currentAnswer.trim().length < 3) {
      setContextSuggestions([]);
      setIsLoadingContext(false);
      setIsRefining(false);
      return;
    }

    // Wait for PRD to be created
    if (!prdId) {
      return;
    }

    // Cancel any pending Phase 2 hybrid search
    if (hybridTimeoutRef.current) {
      clearTimeout(hybridTimeoutRef.current);
      hybridTimeoutRef.current = null;
    }

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Debounce search (400ms)
    setIsLoadingContext(true);
    setIsRefining(false);
    
    searchTimeoutRef.current = setTimeout(async () => {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) return;

      try {
        // Build expanded context if enabled
        // Token guard: Skip prior snippets if query is very long (>200 chars)
        const shouldIncludePriorSnippets = currentAnswer.trim().length <= 200;
        const expandedContext = (useAccumulatedContext || useDependencyHints) ? {
          pinned_chunk_ids: useAccumulatedContext ? Array.from(pinnedChunksGlobal).slice(0, 12) : [],
          prior_answer_snippets: (useAccumulatedContext && shouldIncludePriorSnippets) ? priorAnswerSummariesMemo : [],
          dependency_hints: useDependencyHints ? dependencyHintsMemo : undefined
        } : undefined;

        // Phase 1: Instant BM25 search
        const phase1Result = await ApiClient.searchSections(
          currentAnswer.trim(),
          prdId,
          current.id,
          { pinned_chunks: Array.from(pinnedChunks), expanded_context: expandedContext },
          false, // hybrid=false for Phase 1
          abortControllerRef.current?.signal
        );

        // Check again if aborted
        if (abortControllerRef.current?.signal.aborted) return;

        const queryHash = phase1Result.query_hash;
        setCurrentQueryHash(queryHash);
        const results = phase1Result.results || [];
        setContextSuggestions(results);
        setIsLoadingContext(false);
        setIsRefining(true);

        // Track consecutive low results for auto-clear
        if (results.length < 3) {
          setConsecutiveLowResults(prev => {
            const newCount = prev + 1;
            // Auto-clear if > 3 consecutive low results
            if (newCount > 3) {
              console.log('⚠️ Auto-clearing accumulated context due to consecutive low results');
              clearAccumulatedContext();
              return 0;
            }
            return newCount;
          });
        } else {
          setConsecutiveLowResults(0); // Reset on good results
        }

        // Phase 2: Hybrid search (delayed, optimized to 2s since hybrid is faster)
        hybridTimeoutRef.current = setTimeout(async () => {
          // Check if aborted before starting Phase 2
          if (abortControllerRef.current?.signal.aborted) {
            setIsRefining(false);
            return;
          }

          try {
            // Build expanded context if enabled
            // Token guard: Skip prior snippets if query is very long (>200 chars)
            const shouldIncludePriorSnippets = currentAnswer.trim().length <= 200;
            const expandedContext = (useAccumulatedContext || useDependencyHints) ? {
              pinned_chunk_ids: useAccumulatedContext ? Array.from(pinnedChunksGlobal).slice(0, 12) : [],
              prior_answer_snippets: (useAccumulatedContext && shouldIncludePriorSnippets) ? priorAnswerSummariesMemo : [],
              dependency_hints: useDependencyHints ? dependencyHintsMemo : undefined
            } : undefined;

            const phase2Result = await ApiClient.searchSections(
              currentAnswer.trim(),
              prdId,
              current.id,
              { pinned_chunks: Array.from(pinnedChunks), expanded_context: expandedContext },
              true, // hybrid=true for Phase 2
              abortControllerRef.current?.signal
            );

            // Check if aborted before updating state
            if (abortControllerRef.current?.signal.aborted) return;

            // Only update if query hash matches (query hasn't changed)
            setCurrentQueryHash(prevHash => {
              if (phase2Result.query_hash === queryHash && prevHash === queryHash) {
                setContextSuggestions(phase2Result.results || []);
                setIsRefining(false);
              }
              return prevHash;
            });
          } catch (err) {
            // Ignore abort errors
            if (err instanceof Error && err.name === 'AbortError') return;
            console.error('Hybrid search error:', err);
            setIsRefining(false);
          }
        }, 2000); // Reduced from 3.5s to 2s (hybrid is faster than expected)

      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Search error:', err);
        setContextSuggestions([]);
        setIsLoadingContext(false);
        setIsRefining(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (hybridTimeoutRef.current) {
        clearTimeout(hybridTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [answers, current.id, prdId, pinnedChunks, pinnedChunksGlobal, priorAnswerSummariesMemo, useAccumulatedContext, dependencyHintsMemo, useDependencyHints, hasStarted]);

  // Auto-save
  useEffect(() => {
    if (!hasStarted || !prdId) {
      return;
    }
    const timer = setInterval(async () => {
      if (isSaving) return;
      try {
        setIsSaving(true);
        // save sections with citations and wireframe metadata
        for (const [sid, content] of Object.entries(answers)) {
          const sectionId = sid as SectionId;
          if (content && content.trim()) {
            const citations = sectionCitations[sectionId] || [];
            // If this is the requirements section and we have a wireframe, save it too
            if (sectionId === 'requirements' && uploadedWireframe) {
              const wireframeMetadata = {
                filename: uploadedWireframe.file.name,
                size: uploadedWireframe.file.size,
                uploaded_at: new Date().toISOString(),
                ...(uploadedWireframe.storagePath ? { storage_path: uploadedWireframe.storagePath } : {})
              };
              await ApiClient.savePRDSectionWithWireframe(
                prdId,
                sectionId,
                content,
                uploadedWireframe.storageUrl,
                wireframeMetadata,
                undefined,
                citations
              );
            } else {
              await ApiClient.savePRDSection(prdId, sectionId, content, undefined, citations);
            }
          }
        }
        // save title if edited
        if (title && title !== 'Untitled PRD') {
          await ApiClient.updatePRDTitle(prdId, title);
        }
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [prdId, answers, title, isSaving, sectionCitations, hasStarted, uploadedWireframe]);

  const insertContext = (chunk: any) => {
    const text = chunk.snippet || chunk.content || '';
    setAnswers(prev => ({ ...prev, [current.id]: ((prev[current.id] as string) || '') + (prev[current.id] ? '\n\n' : '') + text }));
    
    // Track citation
    if (chunk.chunk_id || chunk.id) {
      const chunkId = chunk.chunk_id || chunk.id;
      setSectionCitations(prev => ({
        ...prev,
        [current.id]: [...(prev[current.id] || []), chunkId].filter((id, idx, arr) => arr.indexOf(id) === idx) // deduplicate
      }));
    }
  };

  const handleGenerateDraft = async () => {
    if (!prdId || isGeneratingDraft) return;

    // Collect chunk IDs: pinned chunks + top 5-8 from contextSuggestions
    const chunkIds = new Set<string>();
    
    // Add pinned chunks
    pinnedChunks.forEach(id => chunkIds.add(id));
    
    // Add top chunks from suggestions (sorted by relevance)
    const sortedSuggestions = [...contextSuggestions]
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, 8);
    
    sortedSuggestions.forEach(s => {
      const id = s.chunk_id || s.id;
      if (id) chunkIds.add(id);
    });

    if (chunkIds.size === 0) {
      alert('Please search and select context first, or pin some chunks.');
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const currentAnswer = answers[current.id] || '';
      const result = await ApiClient.suggestPRDSection(
        prdId,
        current.id,
        currentAnswer,
        Array.from(chunkIds)
      );

      // Update answer based on mode
      if (draftMode === 'replace') {
        setAnswers(prev => ({ ...prev, [current.id]: result.draft }));
      } else {
        // Insert mode: append with separator
        const existingText = answers[current.id] || '';
        const separator = existingText ? '\n\n---\n\n' : '';
        setAnswers(prev => ({ ...prev, [current.id]: existingText + separator + result.draft }));
      }

      // Track citations
      setSectionCitations(prev => ({
        ...prev,
        [current.id]: [...(prev[current.id] || []), ...result.citations].filter((id, idx, arr) => arr.indexOf(id) === idx)
      }));

      // Show success feedback (you can replace with toast if you have one)
      console.log(`✅ Draft generated • ${result.citations.length} citations added • ${draftMode} mode`);
    } catch (error: any) {
      console.error('Draft generation error:', error);
      alert(error.message || 'Failed to generate draft. Please try again.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const startRecording = async () => {
    try {
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
        const currentText = answers[current.id] || '';
        
        setIsTranscribing(true);
        try {
          const { text } = await ApiClient.transcribeSpeech(blob);
          // Only update if server transcription is different (more accurate) or if we don't have real-time text
          if (text && text.trim() !== currentText.trim()) {
            if (draftMode === 'replace') {
              setAnswers(prev => ({ ...prev, [current.id]: text }));
            } else {
              const existingText = answers[current.id] || '';
              const separator = existingText ? '\n\n' : '';
              setAnswers(prev => ({ ...prev, [current.id]: existingText + separator + text }));
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
          // Capture starting text based on mode
          startingTextRef.current = draftMode === 'replace' ? '' : (answers[current.id] || '');
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
            
            // Build display text: starting text + final transcript + current interim
            const displayText = startingTextRef.current + 
              (startingTextRef.current && finalTranscriptRef.current ? (draftMode === 'replace' ? ' ' : '\n\n') : '') + 
              finalTranscriptRef.current.trim() + 
              (lastInterimRef.current ? ' ' + lastInterimRef.current : '');
            
            setAnswers(prev => ({ ...prev, [current.id]: displayText }));
          };
          recognition.onerror = (_e: any) => {};
          recognition.onend = () => {
            // When recognition ends, show final transcript (no interim)
            const displayText = startingTextRef.current + 
              (startingTextRef.current && finalTranscriptRef.current ? (draftMode === 'replace' ? ' ' : '\n\n') : '') + 
              finalTranscriptRef.current.trim();
            setAnswers(prev => ({ ...prev, [current.id]: displayText }));
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

  const togglePin = (chunkId: string) => {
    setPinnedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
    // Also update global pinned chunks (capped at 12)
    setPinnedChunksGlobal(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        if (newSet.size < 12) { // Cap at 12
          newSet.add(chunkId);
        }
      }
      return newSet;
    });
  };

  const clearAccumulatedContext = () => {
    setPinnedChunksGlobal(new Set());
    setPriorAnswerSummaries([]);
    setConsecutiveLowResults(0);
  };

  const handleWireframeUpload = (file: File, preview: string, storage: { storageUrl?: string; storagePath?: string }) => {
    setUploadedWireframe({ file, preview, storageUrl: storage.storageUrl, storagePath: storage.storagePath });
    toast({
      title: 'Wireframe uploaded',
      description: 'You can now generate requirements from this wireframe in the next step.',
    });
  };

  const handleWireframeRemove = () => {
    setUploadedWireframe(null);
  };

  const handleGenerateFromWireframe = async () => {
    if (!uploadedWireframe || !prdId) return;

    setIsGeneratingFromWireframe(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix to get pure base64
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadedWireframe.file);

      const base64Data = await base64Promise;

      // Prepare context
      const context = {
        objective: answers.objective || '',
        background: answers.background || '',
        scope: answers.scope || ''
      };

      // Prepare retrieved chunks (top 5-8 from context suggestions)
      const topChunks = contextSuggestions
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
        .slice(0, 8);

      // Track analytics
      analytics.trackGenerationStart(
        !!(context.objective || context.background || context.scope),
        topChunks.length > 0
      );

      // Call API
      const result = await ApiClient.generateRequirementsFromWireframe(
        base64Data,
        context,
        topChunks
      );

      // Update requirements textarea
      setAnswers(prev => ({ ...prev, requirements: result.requirements }));

      // Track success
      analytics.trackGenerationSuccess(
        result.confidence,
        result.metadata.word_count || 0,
        result.metadata.components_detected || 0
      );

      // Show confidence toast
      if (result.confidence < 70) {
        toast({
          title: `Requirements generated (${result.confidence}% confidence)`,
          description: 'The generated requirements may need review. Please validate the details.',
          variant: 'default',
        });
      } else {
        toast({
          title: `Requirements generated (${result.confidence}% confidence)`,
          description: 'You can now review and edit the generated requirements.',
        });
      }
    } catch (error: any) {
      console.error('Generate from wireframe error:', error);
      analytics.trackGenerationFailure(error.message || 'Unknown error');
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate requirements from wireframe',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingFromWireframe(false);
    }
  };

  const handleNext = () => {
    // Accumulate prior answer before moving to next step
    if (currentStep < PRD_QUESTIONS.length - 1) {
      const currentAnswer = answers[current.id]?.trim();
      if (currentAnswer && currentAnswer.length > 0) {
        const summary = truncateAtLastPeriod(currentAnswer, 320);
        setPriorAnswerSummaries(prev => {
          const updated = [...prev, summary].slice(0, 4); // Cap at 4
          return updated;
        });
      }
      setCurrentStep(s => s + 1);
      // Reset current section pinned chunks (they're now in global)
      setPinnedChunks(new Set());
    }
    // Note: "Complete PRD" button is now replaced by "Generate PRD Document" button
  };

  // Check if all required sections have non-empty answers
  const allSectionsFilled = useMemo(() => {
    return PRD_QUESTIONS.every(q => {
      const answer = answers[q.id]?.trim();
      return answer && answer.length > 0;
    });
  }, [answers]);

  // Collect all citation chunk IDs from all sections
  const allCitationIds = useMemo(() => {
    const allIds: string[] = [];
    PRD_QUESTIONS.forEach(q => {
      const citations = sectionCitations[q.id] || [];
      allIds.push(...citations);
    });
    return [...new Set(allIds)]; // Deduplicate
  }, [sectionCitations]);

  const handleAssemblePRD = async () => {
    if (!prdId || !allSectionsFilled) return;

    setIsAssembling(true);
    setAssemblyError(null);

    try {
      // Collect all sections
      const sections = {
        objective: answers.objective || '',
        background: answers.background || '',
        scope: answers.scope || '',
        requirements: answers.requirements || '',
        metrics: answers.metrics || '',
        dependencies: answers.dependencies || '',
        timeline: answers.timeline || ''
      };

      // Call assembly API
      const result = await ApiClient.assemblePRD(prdId, sections, allCitationIds);
      console.log('assemble result', result);

      let structuredSections = Array.isArray(result.structured_sections)
        ? (result.structured_sections as GeneratedSection[])
        : [];

      if ((!structuredSections || structuredSections.length === 0) && result.prd_text) {
        structuredSections = parseSectionsFromMarkdown(result.prd_text);
      }

      const effectiveSummary = (result.summary as GenerationSummary | undefined) ??
        (structuredSections.length > 0 ? buildSummaryFromSections(structuredSections, getConfidenceLevel) : undefined);

      setAssembledPRD({
        prd_text: result.prd_text,
        sections: structuredSections,
        summary: effectiveSummary,
      });
      setShowPreviewModal(true);
      // Success is shown in the modal, no need for separate toast
    } catch (err) {
      console.error('PRD assembly failed:', err);
      setAssemblyError((err as Error).message || 'Failed to generate PRD document');
    } finally {
      setIsAssembling(false);
    }
  };

  const handleSaveAssembledPRD = async () => {
    if (!prdId || !assembledPRD) return;

    try {
      // The assembled text is already saved in the database by the backend
      // Just navigate to the PRD view
      navigate(`/prd/${prdId}`);
    } catch (err) {
      console.error('Failed to save PRD:', err);
      alert('Failed to save PRD. Please try again.');
    }
  };

  const handleEditManually = () => {
    setShowPreviewModal(false);
    // Navigate to PRD view where user can edit
    if (prdId) {
      navigate(`/prd/${prdId}`);
    }
  };

  const handleRegenerate = async () => {
    setAssembledPRD(null);
    await handleAssemblePRD();
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };
  const heroContent = (
    <div
      className="relative min-h-screen overflow-hidden bg-[#050509] text-white bg-cover bg-center"
      style={{ backgroundImage: "url('/prd_bg.png')" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#181124] via-[#050509]/85 to-[#050509]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#7c5cff] via-[#2f1d66] to-transparent opacity-60 blur-[160px]" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[380px] w-[380px] rounded-full bg-gradient-to-br from-[#0d1726] via-[#2d3a5f] to-transparent opacity-60 blur-[180px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-28">
          <div className="animate-[fadeInUp_700ms_ease_700ms] w-full max-w-3xl text-center">
            <h1 className="mt-6 text-4xl font-light tracking-tight text-white sm:text-5xl md:text-6xl">
              Create your PRD with conviction.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-white/60 md:text-lg">
              Your PRD, powered by intelligence, designed for intent.
            </p>
            <div className="animate-[fadeInUp_700ms_ease_300ms] mx-auto mt-10 flex w-full max-w-xl items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left shadow-[0_40px_120px_rgba(50,30,120,0.35)] backdrop-blur-md">
              <Sparkles className="mr-3 h-4 w-4 text-white/50" />
              <div className="relative w-full font-mono text-sm tracking-wide text-white/60 md:text-base">
                {typedHeroLine}
                <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-white/60 align-middle md:h-5" />
              </div>
            </div>
            <div className="animate-[fadeInUp_700ms_ease_500ms] mt-12 flex justify-center">
              <Button
                onClick={() => {
                  setHasStarted(true);
                  setShowMobileSidebar(false);
                }}
                className="group relative h-14 rounded-full border border-white/10 bg-white/10 px-10 text-base font-medium tracking-tight text-white/75 shadow-none backdrop-blur-xl transition-colors duration-300 hover:border-white/20 hover:bg-white/15 hover:text-white"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 blur-[20px] transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute inset-0 rounded-full border border-white/0 transition-colors duration-300 group-hover:border-white/20" />
                <span className="relative flex items-center gap-3">
                  Begin with Clarity
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </div>
          </div>

          <div className="animate-[fadeInUp_700ms_ease_700ms] mt-24 w-full max-w-5xl">
            <div className="grid grid-cols-1 gap-8 text-left md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <p className="text-sm uppercase tracking-[0.35em] text-white/40">Structured Flow</p>
                <h3 className="mt-4 text-lg font-medium text-white">Guided 7-step input</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  Move through essential prompts that frame intent, context, and conviction—without noise.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <p className="text-sm uppercase tracking-[0.35em] text-white/40">Intelligent Drafting</p>
                <h3 className="mt-4 text-lg font-medium text-white">AI-powered clarity</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  Surface the right references, assemble refined prose, and keep every decision anchored in data.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <p className="text-sm uppercase tracking-[0.35em] text-white/40">Integrated Context</p>
                <h3 className="mt-4 text-lg font-medium text-white">Grounded in your workspace</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  Pull source material from Google Drive, Notion, and Slack so every draft stays tied to the docs your team already trusts.
                </p>
              </div>
            </div>
          </div>
        </main>
        <footer className="relative flex justify-center px-8 pb-10">
          <span className="text-xs text-white/45">Crafted by product thinkers, for product thinkers.</span>
        </footer>
      </div>
    </div>
  );

  const builderContent = (
    <div id="prd-builder-root" className="min-h-screen bg-[#050509] text-white transition-colors">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#06040d]/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-10 py-5 flex items-center gap-4 text-white">
          <Button
            variant="ghost"
            onClick={() => { setExitError(''); setTempTitle(''); setShowExitDialog(true); }}
            className="rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-xl font-semibold outline-none text-white placeholder:text-white/40"
            placeholder="Untitled PRD"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-10 py-12">
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.06] px-8 py-6 backdrop-blur">
          <div className="flex items-start gap-3 text-white/80">
            <Sparkles className="w-5 h-5 text-white/70 mt-1" />
            <p className="leading-relaxed">Let's create your PRD. I'll guide you through seven deliberate prompts and surface supporting context from your sources.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-10">
          {PRD_QUESTIONS.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded-full transition-colors ${idx <= currentStep ? 'bg-white' : 'bg-white/15'}`} />
          ))}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold text-white">Question {currentStep + 1} of {PRD_QUESTIONS.length}: {current.question}</h2>
            {((pinnedChunksGlobal.size > 0 || priorAnswerSummariesMemo.length > 0) || (dependencyHintsMemo.terms.length + dependencyHintsMemo.entities.length + dependencyHintsMemo.dates.length >= 2)) && (
              <div className="flex items-center gap-2">
                {(pinnedChunksGlobal.size > 0 || priorAnswerSummariesMemo.length > 0) && (
                  <div className="px-3 py-1 rounded-md border border-white/15 bg-white/[0.08] text-xs text-white/70">
                    Using {pinnedChunksGlobal.size} pinned {pinnedChunksGlobal.size === 1 ? 'item' : 'items'}
                    {priorAnswerSummariesMemo.length > 0 && `, ${priorAnswerSummariesMemo.length} prior ${priorAnswerSummariesMemo.length === 1 ? 'answer' : 'answers'}`}
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-white/60 hover:text-white"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Settings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border border-white/15 bg-[#0a0814] text-white/80">
                    <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-white/40">Search Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem className="flex items-center justify-between cursor-default focus:bg-white/10">
                      <div className="flex flex-col">
                        <span className="text-sm text-white">Use context</span>
                        <span className="text-xs text-white/50">Accumulate pinned items across sections</span>
                      </div>
                      <Switch
                        checked={useAccumulatedContext}
                        onCheckedChange={setUseAccumulatedContext}
                        className="ml-2"
                      />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center justify-between cursor-default focus:bg-white/10">
                      <div className="flex flex-col">
                        <span className="text-sm text-white">Use hints</span>
                        <span className="text-xs text-white/50">
                          Cross-question dependency hints
                          {dependencyHintSummary && (
                            <span className="block text-[11px] text-white/40 mt-1">{dependencyHintSummary}</span>
                          )}
                        </span>
                      </div>
                      <Switch
                        checked={useDependencyHints}
                        onCheckedChange={setUseDependencyHints}
                        className="ml-2"
                      />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={clearAccumulatedContext}
                      className="text-red-400 focus:text-red-300 focus:bg-white/10 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      Clear accumulated context
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {(isLoadingContext || contextSuggestions.length > 0 || isRefining) && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-white/70" />
              <p className="text-sm font-medium text-white/80">
                {isLoadingContext ? 'Searching...' : isRefining ? 'Refining results with AI...' : 'I found relevant context from your documents:'}
              </p>
              {isRefining && <Loader2 className="w-4 h-4 text-white/70 animate-spin" />}
            </div>
            {isLoadingContext && contextSuggestions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
                <span className="ml-2 text-sm text-white/60">Finding relevant context...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {contextSuggestions.map((s, i) => (
                  <div
                    key={s.chunk_id || s.id || i}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{s.title || 'Document'}</p>
                        <p className="text-xs text-white/50 mt-1">{s.source} • {new Date(s.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => togglePin(s.chunk_id || s.id)}
                          className={`p-2 ${pinnedChunks.has(s.chunk_id || s.id) ? 'text-yellow-300 hover:text-yellow-200' : 'text-white/60 hover:text-white'}`}
                          title={pinnedChunks.has(s.chunk_id || s.id) ? 'Unpin' : 'Pin'}
                        >
                          <Pin className={`w-4 h-4 ${pinnedChunks.has(s.chunk_id || s.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => insertContext(s)} 
                          className="text-white/80 hover:text-white"
                        >
                          Insert →
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 line-clamp-3">{s.snippet || s.content}</p>
                    {pinnedChunks.has(s.chunk_id || s.id) && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-300">
                        <Pin className="w-3 h-3 fill-current" />
                        <span>Pinned</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-white/70">Your answer:</label>
            {(contextSuggestions.length > 0 || pinnedChunks.size > 0) && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] p-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={draftMode === 'insert' ? 'default' : 'ghost'}
                          onClick={() => setDraftMode('insert')}
                          className={`h-7 px-2 text-xs ${draftMode === 'insert' ? 'rounded-md border border-white/15 bg-white/90 text-gray-900 hover:bg-white' : 'rounded-md border border-white/10 text-white/60 hover:border-white/20 hover:text-white'}`}
                        >
                          <Plus className="w-3 h-3 mr-0.5" />
                          Insert
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Insert: Keeps your existing content and adds the AI-generated draft below it</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={draftMode === 'replace' ? 'default' : 'ghost'}
                          onClick={() => setDraftMode('replace')}
                          className={`h-7 px-2 text-xs ${draftMode === 'replace' ? 'rounded-md border border-white/15 bg-white/90 text-gray-900 hover:bg-white' : 'rounded-md border border-white/10 text-white/60 hover:border-white/20 hover:text-white'}`}
                        >
                          <RotateCcw className="w-3 h-3 mr-0.5" />
                          Replace
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Replace: Overwrites your current text with the AI-generated draft</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft}
                  className="h-7 rounded-md border border-white/10 px-3 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/15 hover:text-white"
                  title="Use AI to improve and enhance your answer based on context"
                >
                  {isGeneratingDraft ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Improve via AI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className="relative">
            <textarea
              value={answers[current.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
              placeholder={current.placeholder}
              className="w-full h-64 rounded-xl border border-white/15 bg-white/[0.03] p-4 pr-12 text-white resize-none focus:outline-none focus:border-white/40 placeholder:text-white/30"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={isTranscribing}
              className={`absolute bottom-3 right-3 z-10 rounded-lg bg-white/[0.08] p-2 backdrop-blur ${isRecording ? 'text-red-300 hover:text-red-200' : 'text-white/60 hover:text-white'}`}
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
          </div>
        </div>

        {/* Wireframe Upload - Show on Step 3 (Scope) */}
        {currentStep === 2 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-white/70" />
              <label className="text-sm font-medium text-white/70">Upload Wireframe (Optional)</label>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-white/50 mb-4">
                Upload a wireframe or sketch to generate detailed requirements in the next step.
              </p>
              <WireframeUpload
                onUpload={handleWireframeUpload}
                onRemove={handleWireframeRemove}
                uploadedFile={uploadedWireframe}
                maxSizeMB={10}
                acceptedFormats={['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']}
              />
            </div>
          </div>
        )}

        {/* Wireframe-based Generation - Show on Step 4 (Requirements) */}
        {currentStep === 3 && uploadedWireframe && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {uploadedWireframe.file.type.startsWith('image/') ? (
                  <img
                    src={uploadedWireframe.preview}
                    alt="Wireframe"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image className="h-6 w-6 text-white/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white mb-1">📷 Wireframe Uploaded</p>
                <p className="text-xs text-white/50 mb-3">{uploadedWireframe.file.name}</p>
                <Button
                  onClick={handleGenerateFromWireframe}
                  disabled={isGeneratingFromWireframe}
                  className="rounded-md border border-white/15 bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white"
                >
                  {isGeneratingFromWireframe ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing wireframe...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Requirements from Wireframe
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={`flex items-center ${currentStep === 0 ? 'justify-end' : 'justify-between'}`}>
          {currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={handleBack}
              className="rounded-full border border-white/10 bg-white/5 text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Previous question"
              title="Previous question"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous Question
            </Button>
          )}
          {currentStep === PRD_QUESTIONS.length - 1 ? (
            <Button 
              onClick={handleAssemblePRD} 
              disabled={!allSectionsFilled || isAssembling || !prdId}
              className="rounded-full border border-white/15 bg-white/90 px-6 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Generate PRD Document"
            >
              {isAssembling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assembling final PRD...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PRD Document
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="rounded-full border border-white/15 bg-white/90 px-6 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white"
              aria-label="Next question"
            >
              Next Question
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {lastSaved && (
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">💾 Draft auto-saved {formatTimeAgo(lastSaved)}</p>
          </div>
        )}

        {assemblyError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">
            <p className="text-sm">{assemblyError}</p>
          </div>
        )}

        {currentStep === PRD_QUESTIONS.length - 1 && !allSectionsFilled && (
          <div className="mt-4 rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3 text-yellow-100">
            <p className="text-sm">Please fill all required sections before generating the PRD document.</p>
          </div>
        )}
      </div>

      {/* PRD Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border/60">
          <DialogHeader>
            <DialogTitle className="text-foreground">PRD Document Preview</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review the generated PRD document. You can save it, edit manually, or regenerate.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            {assembledPRD ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Generation summary</h3>
                      <p className="text-sm text-white/55">
                        {totalSectionsGenerated} sections processed · confidence snapshot below.
                      </p>
                    </div>
                    <div className="grid w-full gap-3 text-sm sm:grid-cols-3 lg:w-auto">
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-100">
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/70">Complete</p>
                        <p className="text-2xl font-semibold">{summaryComplete}</p>
                      </div>
                      <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-amber-100">
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">
                          Needs validation
                        </p>
                        <p className="text-2xl font-semibold">{summaryNeedsValidation}</p>
                      </div>
                      <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-rose-100">
                        <p className="text-xs uppercase tracking-[0.2em] text-rose-200/70">Requires input</p>
                        <p className="text-2xl font-semibold">{summaryRequiresInput}</p>
                      </div>
                    </div>
                  </div>
                  {(summaryNextSteps.length > 0 ||
                    (summaryContextSources?.workspace_chunks?.details &&
                      summaryContextSources.workspace_chunks.details.length > 0) ||
                    typeof summaryContextSources?.user_sections === 'number' ||
                    typeof summaryContextSources?.best_practices_sections === 'number') && (
                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                      {summaryNextSteps.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Next steps</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
                            {summaryNextSteps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Context sources</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/65">
                          {typeof summaryContextSources?.user_sections === 'number' && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              User sections: {summaryContextSources.user_sections}
                            </span>
                          )}
                          {typeof summaryContextSources?.best_practices_sections === 'number' && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              Best practices referenced: {summaryContextSources.best_practices_sections}
                            </span>
                          )}
                          {summaryContextSources?.workspace_chunks?.details?.map((detail) => (
                            <span
                              key={detail}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                            >
                              {detail}
                            </span>
                          ))}
                          {summaryContextSources?.workspace_chunks?.count &&
                            (!summaryContextSources.workspace_chunks.details ||
                              summaryContextSources.workspace_chunks.details.length === 0) && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                Workspace chunks: {summaryContextSources.workspace_chunks.count}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  {assembledPRD.sections.map((section) => {
                    const confidencePercent = Math.round(section.confidence_percent ?? 0);
                    const level = getConfidenceLevel(confidencePercent);
                    const meta = CONFIDENCE_META[level];
                    const needsValidation = section.needs_validation?.filter(Boolean) ?? [];
                    const requiresInput = section.requires_input?.filter(Boolean) ?? [];
                    const hasContent = Boolean(section.content && section.content.trim().length > 0);

                    return (
                      <div
                        key={section.number}
                        className={cn(
                          'rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-lg transition-all',
                          meta.containerClass
                        )}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                              Section {section.number.toString().padStart(2, '0')}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-white">{section.title}</h3>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                              meta.badgeClass
                            )}
                          >
                            <meta.Icon className="h-3.5 w-3.5" />
                            {meta.label} · {confidencePercent}%
                          </span>
                        </div>

                        {hasContent && (
                          <div className="mt-4 prose prose-sm max-w-none text-white/85 prose-invert">
                            <ReactMarkdown>{section.content || ''}</ReactMarkdown>
                          </div>
                        )}

                        {level === 'medium' && needsValidation.length > 0 && (
                          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
                            <p className="text-sm font-medium">Validate before finalizing:</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                              {needsValidation.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {level === 'low' && (
                          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">
                            <p className="text-sm font-medium">This section needs clarification:</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                              {requiresInput.length > 0 ? (
                                requiresInput.map((item) => <li key={item}>{item}</li>)
                              ) : (
                                <li>Provide additional guidance for this section.</li>
                              )}
                            </ul>
                            {(section.missing_context || section.confidence_rationale) && (
                              <p className="mt-3 text-xs text-rose-100/75">
                                {section.missing_context
                                  ? `Context gap: ${section.missing_context}`
                                  : section.confidence_rationale}
                              </p>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReturnToSection(section.number)}
                              className="mt-4 border border-rose-400/40 text-rose-100 hover:bg-rose-500/20 hover:text-rose-50"
                            >
                              Return to builder
                            </Button>
                          </div>
                        )}

                        {level !== 'low' && section.confidence_rationale && (
                          <p className="mt-4 text-xs text-white/45">
                            Why this confidence: {section.confidence_rationale}
                          </p>
                        )}

                        {section.context_sources && section.context_sources.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {section.context_sources.map((source) => (
                              <span
                                key={`${section.number}-${source}`}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65"
                              >
                                {source}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No PRD content available.</p>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isAssembling}
              className="border-border/60 text-muted-foreground hover:bg-muted/60"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              onClick={handleEditManually}
              className="border-border/60 text-muted-foreground hover:bg-muted/60"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Manually
            </Button>
            <Button
              onClick={handleSaveAssembledPRD}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={(open) => setShowExitDialog(open)}>
        <AlertDialogContent className="max-w-lg border border-white/15 bg-[#0b0616]/95 text-white shadow-[0_32px_120px_rgba(45,20,80,0.55)] backdrop-blur-xl">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500/15 via-sky-400/10 to-transparent opacity-70 blur-xl" />
          <div className="relative">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-semibold text-white tracking-tight">Leave PRD builder?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-white/60">
                You can discard this draft or save it and return later. {(!title || title === 'Untitled PRD') && 'Please enter a title to save this PRD.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {(!title || title === 'Untitled PRD') && (
              <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                <label className="block text-xs uppercase tracking-[0.3em] text-white/40 mb-2">PRD Title</label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Enter a title"
                  className="w-full rounded-xl border border-white/15 bg-[#0d081c]/70 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
                />
                {exitError && <p className="mt-2 text-xs text-rose-300">{exitError}</p>}
              </div>
            )}
            <AlertDialogFooter className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              <AlertDialogCancel className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl border border-white/10 bg-rose-500/80 px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(244,114,182,0.35)] transition-all hover:bg-rose-500"
                onClick={async () => {
                  try {
                    if (prdId) {
                      await ApiClient.deletePRDVersion(prdId);
                    }
                  } catch (e) {
                    // ignore errors on discard
                  } finally {
                    setShowExitDialog(false);
                    navigate('/dashboard');
                  }
                }}
              >
                Discard
              </AlertDialogAction>
              <AlertDialogAction
                className="rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(88,70,200,0.35)] transition-transform hover:-translate-y-0.5"
                onClick={async () => {
                  try {
                    setExitError('');
                    if (!prdId) {
                      setShowExitDialog(false);
                      navigate('/dashboard');
                      return;
                    }
                    const effectiveTitle = (title && title !== 'Untitled PRD') ? title : tempTitle.trim();
                    if (!effectiveTitle) {
                      setExitError('Title is required to save.');
                      return;
                    }
                    if (effectiveTitle !== title) {
                      await ApiClient.updatePRDTitle(prdId, effectiveTitle);
                    }
                    // Quick save sections
                    for (const [sid, content] of Object.entries(answers)) {
                      const sectionId = sid as SectionId;
                      if (content && content.trim()) {
                        const citations = sectionCitations[sectionId] || [];
                        await ApiClient.savePRDSection(prdId, sectionId, content, undefined, citations);
                      }
                    }
                    setShowExitDialog(false);
                    navigate('/dashboard');
                  } catch (error) {
                    console.error(error);
                    setExitError('Failed to save draft. Please try again.');
                  }
                }}
              >
                Save draft & exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const sidebarContent = (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-[#06040d]/95 text-white backdrop-blur-2xl border-r border-white/10 transition-all duration-500 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-80'}
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:relative lg:h-auto lg:translate-x-0
      `}
    >
      <div className={`border-b border-white/10 ${sidebarCollapsed ? 'p-4' : 'px-6 py-5'}`}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(false)}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setHasStarted(true);
                setShowMobileSidebar(false);
              }}
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/10 text-white/70 hover:text-white"
              title="New PRD"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-[0.55em] text-white/40">Haven7</span>
                <span className="text-2xl font-semibold tracking-tight text-white">PRD Studio</span>
              </div>
              <p className="text-sm leading-relaxed text-white/55 max-w-xs">
                A calm workspace where product ideas gain structure, evidence, and conviction.
              </p>
              <Button
                onClick={() => {
                  setHasStarted(true);
                  setShowMobileSidebar(false);
                }}
                className="group w-full justify-center rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium tracking-tight text-white/75 transition-colors duration-300 hover:border-white/20 hover:bg-white/15 hover:text-white"
              >
                <span className="relative flex items-center gap-2">
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  New PRD
                </span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(true)}
              className="mt-1 h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/70 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">Recent PRDs</p>
              <button
                onClick={() => {
                  navigate('/prds');
                  setShowMobileSidebar(false);
                }}
                className="text-[11px] text-white/60 hover:text-white transition-colors"
              >
                View all
              </button>
            </div>
            {isSidebarLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : sidebarError ? (
              <p className="text-xs text-red-300/80">{sidebarError}</p>
            ) : recentPRDs.length > 0 ? (
              <div className="space-y-2">
                {recentPRDs.map(prd => {
                  const updatedAt = new Date(prd.updated_at);
                  return (
                    <div
                      key={prd.id}
                      onClick={() => {
                        navigate(`/prd/${prd.id}`);
                        setShowMobileSidebar(false);
                      }}
                      className="group cursor-pointer rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.08]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-white/[0.06] p-2">
                          <FileText className="h-4 w-4 text-white/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{prd.title || 'Untitled PRD'}</p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-white/55">
                            <span>v{prd.version}</span>
                            <span className="text-white/25">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(updatedAt)}
                            </span>
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/25 opacity-0 transition-all duration-200 group-hover:opacity-100" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/45">No recent PRDs yet. Your next draft will appear here.</p>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">My Library</p>
              <button
                onClick={() => {
                  navigate('/prds');
                  setShowMobileSidebar(false);
                }}
                className="text-[11px] text-white/60 hover:text-white transition-colors"
              >
                Manage
              </button>
            </div>
            {isSidebarLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : sidebarError ? (
              <p className="text-xs text-red-300/80">{sidebarError}</p>
            ) : prdGroups.length > 0 ? (
              <div className="space-y-2">
                {prdGroups.slice(0, 5).map(group => {
                  const metaParts: string[] = [];
                  if (group.latestVersion?.version) {
                    metaParts.push(`v${group.latestVersion.version}`);
                  }
                  if (group.updatedAt) {
                    metaParts.push(formatGroupTimestamp(group.updatedAt));
                  }
                  metaParts.push(`${group.totalVersions} version${group.totalVersions !== 1 ? 's' : ''}`);

                  return (
                    <div
                      key={group.groupId}
                      onClick={() => {
                        if (group.latestVersion) {
                          navigate(`/prd/${group.latestVersion.id}`);
                          setShowMobileSidebar(false);
                        }
                      }}
                      className="group cursor-pointer rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.08]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-white/[0.06] p-2">
                          <Folder className="h-4 w-4 text-white/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{group.title}</p>
                          <p className="mt-1 text-xs text-white/55 truncate">{metaParts.join(' • ')}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/25 opacity-0 transition-all duration-200 group-hover:opacity-100" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/45">No PRDs yet. Begin with clarity to populate your library.</p>
            )}
          </section>
        </div>
      )}

    </aside>
  );

  return (
    <div className="min-h-screen flex bg-[#050509]">
      {/* Mobile overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {sidebarContent}

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex justify-end p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileSidebar(prev => !prev)}
            className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/70 backdrop-blur"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative flex-1">
          {hasStarted ? builderContent : heroContent}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  return `${Math.floor(seconds / 60)} minutes ago`;
}


