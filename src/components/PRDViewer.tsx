import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Download, GitBranch, Eye, Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type SectionId = 'objective' | 'scope' | 'metrics' | 'dependencies' | 'timeline';

const sectionLabels: Record<SectionId, string> = {
  objective: 'Objective & Background',
  scope: 'Scope & Requirements',
  metrics: 'Success Metrics',
  dependencies: 'Dependencies & Constraints',
  timeline: 'Timeline & Milestones'
};

export default function PRDViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prd, setPrd] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{ v1: string | null; v2: string | null }>({ v1: null, v2: null });

  useEffect(() => {
    if (id) {
      loadPRD();
      loadVersions();
    }
  }, [id]);

  const loadPRD = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { prd: data } = await ApiClient.getPRD(id);
      setPrd(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PRD');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = async () => {
    if (!id) return;
    try {
      const { versions: data } = await ApiClient.getPRDVersions(id);
      setVersions(data || []);
    } catch (e: any) {
      console.error('Failed to load versions:', e);
    }
  };

  const handleCreateVersion = async () => {
    if (!id) return;
    setCreatingVersion(true);
    try {
      const { prd: newPRD } = await ApiClient.createPRDVersion(id);
      navigate(`/prd/${newPRD.id}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to create version');
    } finally {
      setCreatingVersion(false);
    }
  };

  const generateMarkdown = (prdData: any): string => {
    if (!prdData || !prdData.prd_sections) return '';
    
    let markdown = `# ${prdData.title}\n\n`;
    markdown += `*Version ${prdData.version} | Generated on ${new Date(prdData.updated_at).toLocaleDateString()}*\n\n`;
    markdown += `---\n\n`;

    const sections = prdData.prd_sections || [];
    const sectionMap: Record<string, string> = {};
    sections.forEach((s: any) => {
      sectionMap[s.section_id] = s.content;
    });

    for (const [id, label] of Object.entries(sectionLabels)) {
      const content = sectionMap[id];
      if (content) {
        markdown += `## ${label}\n\n`;
        markdown += `${content}\n\n`;
        markdown += `---\n\n`;
      }
    }

    return markdown;
  };

  const handleCopy = async () => {
    if (!prd) return;
    const markdown = generateMarkdown(prd);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleDownload = () => {
    if (!prd) return;
    const markdown = generateMarkdown(prd);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prd.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_v${prd.version}_prd.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCompare = async () => {
    if (!selectedVersions.v1 || !selectedVersions.v2) return;
    
    try {
      const [v1Data, v2Data] = await Promise.all([
        ApiClient.getPRD(selectedVersions.v1),
        ApiClient.getPRD(selectedVersions.v2)
      ]);
      
      navigate(`/prd/compare/${selectedVersions.v1}/${selectedVersions.v2}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to load versions for comparison');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading PRD...</div>
      </div>
    );
  }

  if (error || !prd) {
    return (
      <div className="p-6">
        <div className="text-red-400 mb-4">{error || 'PRD not found'}</div>
        <Button onClick={() => navigate('/prds')} variant="outline">Back to PRDs</Button>
      </div>
    );
  }

  const sections = prd.prd_sections || [];
  const sectionMap: Record<string, any> = {};
  sections.forEach((s: any) => {
    sectionMap[s.section_id] = s;
  });

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/prds')} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-white">{prd.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                <span>Version {prd.version}</span>
                <span>•</span>
                <span className="capitalize">{prd.status}</span>
                <span>•</span>
                <span>Updated {new Date(prd.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {copied ? 'Copied!' : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={creatingVersion}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              {creatingVersion ? 'Creating...' : 'New Version'}
            </Button>
          </div>
        </div>

        {/* Versions List */}
        {versions.length > 1 && (
          <div className="mb-6 p-4 bg-[#1f1f23] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Versions</h3>
              <Button
                onClick={() => setCompareMode(!compareMode)}
                variant="ghost"
                size="sm"
              >
                {compareMode ? 'Cancel' : 'Compare Versions'}
              </Button>
            </div>
            {compareMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={selectedVersions.v1 || ''}
                    onChange={(e) => setSelectedVersions({ ...selectedVersions, v1: e.target.value })}
                    className="bg-[#0f0f11] border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select version 1</option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>v{v.version} - {v.status}</option>
                    ))}
                  </select>
                  <select
                    value={selectedVersions.v2 || ''}
                    onChange={(e) => setSelectedVersions({ ...selectedVersions, v2: e.target.value })}
                    className="bg-[#0f0f11] border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select version 2</option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>v{v.version} - {v.status}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleCompare}
                  disabled={!selectedVersions.v1 || !selectedVersions.v2}
                  size="sm"
                >
                  Compare
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {versions.map(v => (
                  <Button
                    key={v.id}
                    onClick={() => navigate(`/prd/${v.id}`)}
                    variant={v.id === id ? 'default' : 'outline'}
                    size="sm"
                  >
                    v{v.version}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRD Content */}
        <div className="space-y-6">
          {Object.entries(sectionLabels).map(([id, label]) => {
            const section = sectionMap[id];
            if (!section) return null;

            return (
              <div key={id} className="bg-[#1f1f23] rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">{label}</h2>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-4" {...props} />,
                      strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc ml-6 space-y-2 text-gray-300" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal ml-6 space-y-2 text-gray-300" {...props} />,
                      li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                    }}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

