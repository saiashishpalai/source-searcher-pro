import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // Fetch context for current question
  useEffect(() => {
    (async () => {
      if (!current) return;
      try {
        setIsLoadingContext(true);
        const result = await ApiClient.post('/api/search', { query: current.contextQuery, limit: 3 } as any);
        setContextSuggestions((result as any)?.results || []);
      } catch {
        setContextSuggestions([]);
      } finally {
        setIsLoadingContext(false);
      }
    })();
  }, [currentStep]);

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

  const insertContext = (text: string) => {
    setAnswers(prev => ({ ...prev, [current.id]: ((prev[current.id] as string) || '') + (prev[current.id] ? '\n\n' : '') + text }));
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

        {!!contextSuggestions.length && (
          <div className="mb-6 p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-medium text-gray-300">I found relevant context from your documents:</p>
            </div>
            <div className="space-y-4">
              {contextSuggestions.map((s, i) => (
                <div key={i} className="p-4 bg-[#0f0f11] border border-gray-700 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{s.title || 'Document'}</p>
                      <p className="text-xs text-gray-400">{s.source} • {s.timestamp}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => insertContext(s.snippet || s.content || '')} className="text-purple-400 hover:text-purple-300">Insert →</Button>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">{s.snippet || s.content}</p>
                </div>
              ))}
            </div>
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


