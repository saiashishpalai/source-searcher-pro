import React, { useEffect, useMemo, useState } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Check, Copy, Download } from 'lucide-react';

type SectionId = 'objective' | 'scope' | 'metrics' | 'dependencies' | 'timeline';

interface PRDBuilderProps {
  initialTitle: string;
  onClose: () => void;
}

const PRD_QUESTIONS: Array<{ id: SectionId; question: string; placeholder: string; hint: string }> = [
  {
    id: 'objective',
    question: 'What problem are you solving?',
    placeholder: 'E.g., Users drop off during onboarding due to confusing flows.',
    hint: 'Be specific about the user pain point and business impact.'
  },
  {
    id: 'scope',
    question: 'What is in scope vs. out of scope?',
    placeholder: 'In scope: A/B test simplified flow\nOut of scope: Billing changes',
    hint: 'Define boundaries clearly for this release.'
  },
  {
    id: 'metrics',
    question: 'How will you measure success?',
    placeholder: 'E.g., +20% activation; <2s response; <1% error rate',
    hint: 'Add quantifiable KPIs with targets.'
  },
  {
    id: 'dependencies',
    question: 'What dependencies or constraints exist?',
    placeholder: 'E.g., OAuth scopes, rate limits, shared components',
    hint: 'List technical and cross-team dependencies.'
  },
  {
    id: 'timeline',
    question: 'What is the timeline?',
    placeholder: 'E.g., MVP in 4 weeks, GA in 8 weeks',
    hint: 'Milestones and key dates.'
  }
];

const generatePRDMarkdown = (title: string, answers: Record<SectionId, string>): string => {
  const sectionLabels: Record<SectionId, string> = {
    objective: 'Objective & Background',
    scope: 'Scope & Requirements',
    metrics: 'Success Metrics',
    dependencies: 'Dependencies & Constraints',
    timeline: 'Timeline & Milestones'
  };

  let markdown = `# ${title}\n\n`;
  markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
  markdown += `---\n\n`;

  for (const [id, label] of Object.entries(sectionLabels)) {
    const content = answers[id as SectionId];
    if (content) {
      markdown += `## ${label}\n\n`;
      markdown += `${content}\n\n`;
      markdown += `---\n\n`;
    }
  }

  return markdown;
};

export default function PRDBuilder({ initialTitle, onClose }: PRDBuilderProps) {
  // Deprecated component retained temporarily to avoid breaking imports; not used in UI
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<SectionId, string>>({
    objective: '', scope: '', metrics: '', dependencies: '', timeline: ''
  });
  const [prdId, setPrdId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = useMemo(() => PRD_QUESTIONS[currentStep], [currentStep]);
  const prdMarkdown = useMemo(() => generatePRDMarkdown(initialTitle, answers), [initialTitle, answers]);

  useEffect(() => {
    const create = async () => {
      try {
        const { prd } = await ApiClient.createPRD(initialTitle || 'Untitled PRD');
        setPrdId(prd.id);
      } catch (e: any) {
        setError(e?.message || 'Failed to create PRD');
      }
    };
    create();
  }, [initialTitle]);

  const saveSection = async (sectionId: SectionId) => {
    if (!prdId) return;
    setIsSaving(true);
    setError(null);
    try {
      await ApiClient.savePRDSection(prdId, sectionId, answers[sectionId]);
    } catch (e: any) {
      setError(e?.message || 'Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (!answers[current.id]?.trim()) return;
    await saveSection(current.id);
    if (currentStep < PRD_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prdMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([prdMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initialTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_prd.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-4xl rounded-lg bg-[#1f1f23] p-6 max-h-[90vh] overflow-y-auto">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">PRD Created Successfully!</h2>
                <p className="text-sm text-gray-400">{initialTitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">Close</button>
          </div>

          <div className="mb-4 flex gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Markdown
                </>
              )}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          <div className="rounded-lg border border-gray-700 bg-[#0f0f11] p-4">
            <div className="mb-2 text-sm font-medium text-gray-400">Preview:</div>
            <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono overflow-x-auto">
              {prdMarkdown}
            </pre>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="default">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-lg bg-[#1f1f23] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create PRD: {initialTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">Close</button>
        </div>

        <div className="mb-6 flex gap-2">
          {PRD_QUESTIONS.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded ${idx <= currentStep ? 'bg-purple-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        <div className="mb-2 text-lg font-medium text-white">{current.question}</div>
        <div className="mb-4 text-sm text-gray-400">{current.hint}</div>

        <textarea
          value={answers[current.id]}
          onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
          placeholder={current.placeholder}
          className="h-48 w-full resize-none rounded-lg border border-gray-700 bg-[#0f0f11] p-4 text-white"
        />

        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}

        <div className="mt-6 flex items-center justify-between">
          <button onClick={handleBack} disabled={currentStep === 0} className="px-4 py-2 text-gray-300 disabled:opacity-50">Back</button>
          <Button onClick={handleNext} disabled={!answers[current.id]?.trim() || isSaving}>
            {currentStep === PRD_QUESTIONS.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}


