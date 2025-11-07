import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type SectionId = 'objective' | 'scope' | 'metrics' | 'dependencies' | 'timeline';

const sectionLabels: Record<SectionId, string> = {
  objective: 'Objective & Background',
  scope: 'Scope & Requirements',
  metrics: 'Success Metrics',
  dependencies: 'Dependencies & Constraints',
  timeline: 'Timeline & Milestones'
};

export default function PRDCompare() {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>();
  const navigate = useNavigate();
  const [prd1, setPrd1] = useState<any>(null);
  const [prd2, setPrd2] = useState<any>(null);
  const [diff, setDiff] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id1 && id2) {
      loadPRDs();
    }
  }, [id1, id2]);

  const loadPRDs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the compare endpoint which includes diff
      const result = await ApiClient.comparePRDs(id1!, id2!);
      setPrd1(result.v1);
      setPrd2(result.v2);
      setDiff(result.diff);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PRDs');
    } finally {
      setIsLoading(false);
    }
  };

  const getSectionContent = (prd: any, sectionId: string): string => {
    if (!prd || !prd.prd_sections) return '';
    const section = prd.prd_sections.find((s: any) => s.section_id === sectionId);
    return section?.content || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading PRDs...</div>
      </div>
    );
  }

  if (error || !prd1 || !prd2) {
    return (
      <div className="p-6">
        <div className="text-destructive mb-4">{error || 'Failed to load PRDs'}</div>
        <Button onClick={() => navigate('/prds')} variant="outline">Back to PRDs</Button>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate(`/prd/${id1}`)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Compare Versions</h1>
              <div className="text-sm text-muted-foreground mt-1">
                {prd1.title} - v{prd1.version} vs v{prd2.version}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Version 1 */}
          <div className="bg-card border border-border/60 rounded-lg p-4">
            <div className="mb-4 pb-3 border-b border-border/60">
              <h2 className="text-lg font-semibold text-foreground">Version {prd1.version}</h2>
              <div className="text-sm text-muted-foreground">
                {new Date(prd1.updated_at).toLocaleDateString()} • {prd1.status}
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(sectionLabels).map(([id, label]) => {
                const content = getSectionContent(prd1, id);
                return (
                  <div key={id} className="border-b border-border/40 pb-3 last:border-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {content || <span className="text-muted-foreground/60">No content</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Version 2 */}
          <div className="bg-card border border-border/60 rounded-lg p-4">
            <div className="mb-4 pb-3 border-b border-border/60">
              <h2 className="text-lg font-semibold text-foreground">Version {prd2.version}</h2>
              <div className="text-sm text-muted-foreground">
                {new Date(prd2.updated_at).toLocaleDateString()} • {prd2.status}
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(sectionLabels).map(([id, label]) => {
                const content = getSectionContent(prd2, id);
                const sectionDiff = diff?.[id];
                const isDifferent = sectionDiff && sectionDiff.type !== 'unchanged';

                return (
                  <div key={id} className="border-b border-border/40 pb-3 last:border-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {label}
                      {isDifferent && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                          {sectionDiff.type === 'added' ? 'Added' : sectionDiff.type === 'removed' ? 'Removed' : 'Modified'}
                        </span>
                      )}
                    </h3>
                    <div className={`text-sm whitespace-pre-wrap ${isDifferent ? 'bg-yellow-500/10 p-2 rounded border border-yellow-500/30' : 'text-muted-foreground'}`}>
                      {content || <span className="text-muted-foreground/60">No content</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

