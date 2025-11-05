import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, Pin, Loader2 } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

type SectionId = 'objective' | 'scope' | 'metrics' | 'dependencies' | 'timeline';

const PRD_QUESTIONS: Array<{ id: SectionId; question: string; placeholder: string; contextQuery: string }> = [
  { id: 'objective', question: 'What problem are you solving?', placeholder: 'Describe the user pain point and why it matters...', contextQuery: 'problem goal objective issue pain point' },
  { id: 'scope', question: 'What is in scope vs. out of scope?', placeholder: 'Define clear boundaries:\n\nIn scope:\n- Feature A\n- Feature B\n\nOut of scope:\n- Feature C', contextQuery: 'scope MVP requirements features excluded' },
  { id: 'metrics', question: 'How will you measure success?', placeholder: 'List quantifiable KPIs:\n- Metric 1: Target value\n- Metric 2: Target value', contextQuery: 'KPI metric goal target success measurement' },
  { id: 'dependencies', question: 'What dependencies or constraints exist?', placeholder: 'Technical or organizational blockers:\n- Depends on X\n- Blocked by Y\n- Constraint Z', contextQuery: 'integration depends on compatibility blocked constraint' },
  { id: 'timeline', question: 'What is the timeline?', placeholder: 'Key milestones:\n- Week 1: X\n- Week 4: Y\n- Week 8: Launch', contextQuery: 'milestone release timeline deadline launch' }
];

export default function PRDNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled PRD');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<SectionId, string>>({ objective: '', scope: '', metrics: '', dependencies: '', timeline: '' });
  const [prdId, setPrdId] = useState<string | null>(null);
  const [contextSuggestions, setContextSuggestions] = useState<any[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [pinnedChunks, setPinnedChunks] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentQueryHash, setCurrentQueryHash] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hybridTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const current = useMemo(() => PRD_QUESTIONS[currentStep], [currentStep]);

  // Create PRD draft on mount
  useEffect(() => {
    (async () => {
      try {
        const { prd } = await ApiClient.createPRD(title);
        setPrdId(prd.id);
      } catch (e) {
        // no-op: surface via UI if needed
      }
    })();
  }, []);

  // Debounced dual-phase search based on user input
  useEffect(() => {
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
        // Phase 1: Instant BM25 search
        const phase1Result = await ApiClient.searchSections(
          currentAnswer.trim(),
          prdId,
          current.id,
          { pinned_chunks: Array.from(pinnedChunks) },
          false, // hybrid=false for Phase 1
          abortControllerRef.current?.signal
        );

        // Check again if aborted
        if (abortControllerRef.current?.signal.aborted) return;

        const queryHash = phase1Result.query_hash;
        setCurrentQueryHash(queryHash);
        setContextSuggestions(phase1Result.results || []);
        setIsLoadingContext(false);
        setIsRefining(true);

        // Phase 2: Hybrid search (delayed, optimized to 2s since hybrid is faster)
        hybridTimeoutRef.current = setTimeout(async () => {
          // Check if aborted before starting Phase 2
          if (abortControllerRef.current?.signal.aborted) {
            setIsRefining(false);
            return;
          }

          try {
            const phase2Result = await ApiClient.searchSections(
              currentAnswer.trim(),
              prdId,
              current.id,
              { pinned_chunks: Array.from(pinnedChunks) },
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
  }, [answers, current.id, prdId, pinnedChunks]);

  // Auto-save
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!prdId) return;
      if (isSaving) return;
      try {
        setIsSaving(true);
        // save sections
        for (const [sid, content] of Object.entries(answers)) {
          const sectionId = sid as SectionId;
          if (content && content.trim()) {
            await ApiClient.savePRDSection(prdId, sectionId, content);
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
  }, [prdId, answers, title, isSaving]);

  const insertContext = (chunk: any) => {
    const text = chunk.snippet || chunk.content || '';
    setAnswers(prev => ({ ...prev, [current.id]: ((prev[current.id] as string) || '') + (prev[current.id] ? '\n\n' : '') + text }));
    
    // Store citation in prd_source_refs (optional, for tracking)
    if (prdId && chunk.chunk_id) {
      // This will be handled by the backend when saving the section
      // For now, we just insert the text
    }
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
  };

  const handleNext = () => {
    if (currentStep < PRD_QUESTIONS.length - 1) {
      setCurrentStep(s => s + 1);
    } else if (prdId) {
      navigate(`/prd/${prdId}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <div className="border-b border-gray-800 bg-[#1f1f23] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white" aria-label="Back to Dashboard" title="Back to Dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-xl font-semibold outline-none"
            placeholder="Untitled PRD"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 mt-1" />
            <p className="text-gray-300">Let's create your PRD. I'll ask you 5 questions and suggest relevant context from your documents.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {PRD_QUESTIONS.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded ${idx <= currentStep ? 'bg-purple-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Question {currentStep + 1} of {PRD_QUESTIONS.length}: {current.question}</h2>
        </div>

        {(isLoadingContext || contextSuggestions.length > 0 || isRefining) && (
          <div className="mb-6 p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-medium text-gray-300">
                {isLoadingContext ? 'Searching...' : isRefining ? 'Refining results with AI...' : 'I found relevant context from your documents:'}
              </p>
              {isRefining && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
            </div>
            {isLoadingContext && contextSuggestions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-400">Finding relevant context...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {contextSuggestions.map((s, i) => (
                  <div key={s.chunk_id || s.id || i} className="p-4 bg-[#0f0f11] border border-gray-700 rounded-lg hover:border-purple-500/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{s.title || 'Document'}</p>
                        <p className="text-xs text-gray-400 mt-1">{s.source} • {new Date(s.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => togglePin(s.chunk_id || s.id)}
                          className={`p-2 ${pinnedChunks.has(s.chunk_id || s.id) ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'}`}
                          title={pinnedChunks.has(s.chunk_id || s.id) ? 'Unpin' : 'Pin'}
                        >
                          <Pin className={`w-4 h-4 ${pinnedChunks.has(s.chunk_id || s.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => insertContext(s)} 
                          className="text-purple-400 hover:text-purple-300"
                        >
                          Insert →
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">{s.snippet || s.content}</p>
                    {pinnedChunks.has(s.chunk_id || s.id) && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
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
          <label className="block text-sm font-medium text-gray-400 mb-2">Your answer:</label>
          <textarea
            value={answers[current.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
            placeholder={current.placeholder}
            className="w-full h-64 bg-[#1f1f23] border border-gray-700 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className={`flex items-center ${currentStep === 0 ? 'justify-end' : 'justify-between'}`}>
          {currentStep > 0 && (
            <Button variant="ghost" onClick={handleBack} className="text-gray-400 hover:text-white" aria-label="Previous question" title="Previous question">
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous Question
            </Button>
          )}
          <Button onClick={handleNext} className="bg-purple-500 hover:bg-purple-600 text-white" aria-label={currentStep === PRD_QUESTIONS.length - 1 ? 'Complete PRD' : 'Next question'}>
            {currentStep === PRD_QUESTIONS.length - 1 ? 'Complete PRD' : 'Next Question'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {lastSaved && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">💾 Draft auto-saved {formatTimeAgo(lastSaved)}</p>
          </div>
        )}
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


