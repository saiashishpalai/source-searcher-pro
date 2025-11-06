import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, Pin, Loader2, RotateCcw, Plus, Mic, Square } from 'lucide-react';
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
  const [draftMode, setDraftMode] = useState<'insert' | 'replace'>('insert');
  const [sectionCitations, setSectionCitations] = useState<Record<SectionId, string[]>>({ objective: [], scope: [], metrics: [], dependencies: [], timeline: [] });
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
        // save sections with citations
        for (const [sid, content] of Object.entries(answers)) {
          const sectionId = sid as SectionId;
          if (content && content.trim()) {
            const citations = sectionCitations[sectionId] || [];
            await ApiClient.savePRDSection(prdId, sectionId, content, undefined, citations);
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
  }, [prdId, answers, title, isSaving, sectionCitations]);

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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-400">Your answer:</label>
            {(contextSuggestions.length > 0 || pinnedChunks.size > 0) && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#1f1f23] border border-gray-700 rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={draftMode === 'insert' ? 'default' : 'ghost'}
                    onClick={() => setDraftMode('insert')}
                    className={`h-7 px-2 text-xs ${draftMode === 'insert' ? 'bg-purple-500 hover:bg-purple-600' : 'text-gray-400 hover:text-gray-300'}`}
                    title="Insert mode: Append draft below existing text"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Insert
                  </Button>
                  <Button
                    size="sm"
                    variant={draftMode === 'replace' ? 'default' : 'ghost'}
                    onClick={() => setDraftMode('replace')}
                    className={`h-7 px-2 text-xs ${draftMode === 'replace' ? 'bg-purple-500 hover:bg-purple-600' : 'text-gray-400 hover:text-gray-300'}`}
                    title="Replace mode: Overwrite textarea content"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Replace
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft}
                  className="bg-purple-500 hover:bg-purple-600 text-white h-7 px-3 text-xs"
                  title="Generate draft from context using AI"
                >
                  {isGeneratingDraft ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Draft from Context
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
              className="w-full h-64 bg-[#1f1f23] border border-gray-700 rounded-lg p-4 pr-12 text-white resize-none focus:outline-none focus:border-purple-500"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={isTranscribing}
              className={`absolute bottom-3 right-3 p-2 z-10 bg-[#1f1f23]/80 backdrop-blur-sm rounded-lg ${isRecording ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-gray-300'}`}
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


