import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, X, Clock, Copy, Download, Share, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ApiClient } from '@/lib/api-client';

type SectionId = 'objective' | 'scope' | 'metrics' | 'dependencies' | 'timeline';

export default function PRDView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prd, setPrd] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [changeSummary, setChangeSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchPRD();
      await fetchVersions();
    })();
  }, [id]);

  const fetchPRD = async () => {
    if (!id) return;
    const { prd } = await ApiClient.getPRD(id);
    setPrd(prd);
    const sections: Record<string, string> = {};
    (prd.prd_sections || []).forEach((s: any) => { sections[s.section_id] = s.content; });
    setEditedSections(sections);
  };

  const fetchVersions = async () => {
    if (!id) return;
    const { versions } = await ApiClient.getPRDVersions(id);
    setVersions(versions || []);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    setChangeSummary('');
    const sections: Record<string, string> = {};
    (prd?.prd_sections || []).forEach((s: any) => { sections[s.section_id] = s.content; });
    setEditedSections(sections);
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const { prd: newPrd } = await ApiClient.createPRDVersion(id, changeSummary || 'Updated PRD');
      for (const [sectionId, content] of Object.entries(editedSections)) {
        await ApiClient.savePRDSection(newPrd.id, sectionId as SectionId, content || '');
      }
      setIsEditing(false);
      setChangeSummary('');
      navigate(`/prd/${newPrd.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyMarkdown = async () => {
    if (!prd) return;
    const md = generateMarkdown(prd);
    await navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 1500);
  };

  const downloadMarkdown = () => {
    if (!prd) return;
    const md = generateMarkdown(prd);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prd.title.replace(/\s+/g, '-')}-v${prd.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdown = (p: any) => {
    let md = `# ${p.title}\n\n`;
    md += `**Version:** ${p.version}\n`;
    md += `**Updated:** ${new Date(p.updated_at).toLocaleDateString()}\n\n`;
    (p.prd_sections || []).forEach((s: any) => {
      md += `## ${formatSectionTitle(s.section_id)}\n\n`;
      md += `${s.content}\n\n`;
    });
    return md;
  };

  const formatSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      objective: 'Objective & Background',
      scope: 'Scope & Requirements',
      metrics: 'Success Metrics',
      dependencies: 'Dependencies & Constraints',
      timeline: 'Timeline & Milestones',
    };
    return titles[sectionId] || sectionId;
  };

  if (!prd) return <div className="min-h-screen bg-[#0f0f11] text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <div className="border-b border-gray-800 bg-[#1f1f23] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/prds')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All PRDs
            </Button>
            <h1 className="text-xl font-semibold">{prd.title}</h1>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleCancel} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-purple-500 hover:bg-purple-600 text-white">
                <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : `Save as v${prd.version + 1}`}
              </Button>
            </div>
          ) : (
            <Button onClick={handleEdit} className="bg-purple-500 hover:bg-purple-600 text-white">
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8 p-4 bg-[#1f1f23] border border-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">{isEditing ? `Editing v${prd.version}...` : `v${prd.version} • Updated ${new Date(prd.updated_at).toLocaleDateString()}`}</span>
            {prd.change_summary && !isEditing && (<span className="text-sm text-gray-500">• {prd.change_summary}</span>)}
          </div>
          {!isEditing && (
            <Button variant="ghost" onClick={() => setShowVersionHistory(!showVersionHistory)} className="text-purple-400 hover:text-purple-300">
              Version History {showVersionHistory ? '▲' : '▼'}
            </Button>
          )}
        </div>

        {showVersionHistory && !isEditing && (
          <div className="mb-8 p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-4">Version History</h3>
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className={`p-4 rounded-lg border ${v.id === prd.id ? 'bg-purple-900/20 border-purple-500/30' : 'bg-[#0f0f11] border-gray-700 hover:border-gray-600 cursor-pointer'}`} onClick={() => v.id !== prd.id && navigate(`/prd/${v.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">v{v.version} {v.id === prd.id && (<span className="ml-2 text-xs text-purple-400">Current</span>)}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                      {v.change_summary && (<p className="text-xs text-gray-500 mt-1">{v.change_summary}</p>)}
                    </div>
                    {v.id !== prd.id && (
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/prd/compare/${prd.id}/${v.id}`); }} className="text-purple-400 hover:text-purple-300">Compare</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div className="mb-8 p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
            <label className="block text-sm font-medium text-gray-400 mb-2">💬 What changed? (optional but recommended)</label>
            <input type="text" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="e.g., Clarified success metrics, added Q2 timeline" className="w-full bg-[#0f0f11] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500" />
          </div>
        )}

        <div className="space-y-8">
          {(prd.prd_sections || []).map((section: any) => (
            <div key={section.id} className="p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-purple-400">{formatSectionTitle(section.section_id)}</h2>
              {isEditing ? (
                <textarea value={editedSections[section.section_id] || ''} onChange={(e) => setEditedSections({ ...editedSections, [section.section_id]: e.target.value })} className="w-full h-48 bg-[#0f0f11] border border-gray-700 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-purple-500" />
              ) : (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>

        {!isEditing && (
          <div className="mt-8 flex gap-4">
            <Button onClick={copyMarkdown} variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#1f1f23] transition-colors">
              {copiedMarkdown ? (<><Check className="w-4 h-4 mr-2 text-green-500" />Copied</>) : (<><Copy className="w-4 h-4 mr-2" />Copy Markdown</>)}
            </Button>
            <Button onClick={downloadMarkdown} variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#1f1f23]"><Download className="w-4 h-4 mr-2" />Download</Button>
            <Button onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500); }} variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#1f1f23] transition-colors">
              {copiedLink ? (<><Check className="w-4 h-4 mr-2 text-green-500" />Link Copied</>) : (<><Share className="w-4 h-4 mr-2" />Share Link</>)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


