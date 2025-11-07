import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, X, Clock, Copy, Download, Share, Check, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ApiClient } from '@/lib/api-client';

const SECTION_DEFINITIONS = [
  { id: 'objective', title: 'Objective' },
  { id: 'background', title: 'Background' },
  { id: 'scope', title: 'Scope' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'metrics', title: 'Success Metrics' },
  { id: 'access_permissions', title: 'Access Permissions' },
  { id: 'notifications', title: 'Notifications' },
  { id: 'reporting', title: 'Reporting' },
  { id: 'analytics_events', title: 'Analytics Events' },
  { id: 'filters', title: 'Filters' },
  { id: 'dependencies', title: 'Dependencies' },
  { id: 'backward_compatibility', title: 'Backward Compatibility' },
  { id: 'release_plan', title: 'Release Plan' },
  { id: 'timeline', title: 'Timeline' }
];

type SectionId = 'objective' | 'background' | 'scope' | 'requirements' | 'metrics' | 'access_permissions' | 'notifications' | 'reporting' | 'analytics_events' | 'filters' | 'dependencies' | 'backward_compatibility' | 'release_plan' | 'timeline';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchPRD();
      await fetchVersions();
    })();
  }, [id]);

  const parseAssembledText = (text: string): Record<string, string> => {
    const sections: Record<string, string> = {
      'objective': '',
      'background': '',
      'scope': '',
      'requirements': '',
      'metrics': '',
      'access_permissions': '',
      'notifications': '',
      'reporting': '',
      'analytics_events': '',
      'filters': '',
      'dependencies': '',
      'backward_compatibility': '',
      'release_plan': '',
      'timeline': ''
    };

    // Map section numbers to IDs
    const sectionNumberMap: Record<number, string> = {
      1: 'objective',
      2: 'background',
      3: 'scope',
      4: 'requirements',
      5: 'metrics',
      6: 'access_permissions',
      7: 'notifications',
      8: 'reporting',
      9: 'analytics_events',
      10: 'filters',
      11: 'dependencies',
      12: 'backward_compatibility',
      13: 'release_plan',
      14: 'timeline'
    };

    // Try to parse by numbered sections: **1. Objective**
    const sectionPattern = /\*\*(\d+)\.\s*([^*]+?)\*\*\s*\n\n([^*]+?)(?=\n\n\*\*\d+\.|$)/gs;
    let match;
    while ((match = sectionPattern.exec(text)) !== null) {
      const sectionNum = parseInt(match[1]);
      const sectionId = sectionNumberMap[sectionNum];
      if (sectionId) {
        sections[sectionId] = match[3].trim();
      }
    }

    // Fallback: try to match by title keywords
    const titleKeywords: Record<string, string[]> = {
      'objective': ['Objective'],
      'background': ['Background'],
      'scope': ['Scope'],
      'requirements': ['Requirements'],
      'metrics': ['Success Metrics', 'Metrics'],
      'access_permissions': ['Access Permissions', 'Permissions'],
      'notifications': ['Notifications'],
      'reporting': ['Reporting'],
      'analytics_events': ['Analytics Events', 'Analytics'],
      'filters': ['Filters'],
      'dependencies': ['Dependencies'],
      'backward_compatibility': ['Backward Compatibility', 'Compatibility'],
      'release_plan': ['Release Plan'],
      'timeline': ['Timeline']
    };

    for (const [id, keywords] of Object.entries(titleKeywords)) {
      if (!sections[id]) {
        for (const keyword of keywords) {
          const regex = new RegExp(`\\*\\*[^\\*]*${keyword}[^\\*]*\\*\\*\\s*\\n\\n([^*]+?)(?=\\n\\n\\*\\*|$)`, 'is');
          const match = text.match(regex);
          if (match) {
            sections[id] = match[1].trim();
            break;
          }
        }
      }
    }

    return sections;
  };

  const fetchPRD = async () => {
    if (!id) return;
    const { prd } = await ApiClient.getPRD(id);
    setPrd(prd);
    
    // Initialize all 14 sections
    const sections: Record<string, string> = {
      'objective': '',
      'background': '',
      'scope': '',
      'requirements': '',
      'metrics': '',
      'access_permissions': '',
      'notifications': '',
      'reporting': '',
      'analytics_events': '',
      'filters': '',
      'dependencies': '',
      'backward_compatibility': '',
      'release_plan': '',
      'timeline': ''
    };

    // If assembled_text exists, parse it to get all sections
    if (prd.assembled_text) {
      const parsed = parseAssembledText(prd.assembled_text);
      Object.assign(sections, parsed);
    }

    // Also merge in any existing prd_sections (in case some sections were saved individually)
    (prd.prd_sections || []).forEach((s: any) => {
      if (s.section_id && s.content) {
        sections[s.section_id] = s.content;
      }
    });

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
    // Reset to original sections
    const sections: Record<string, string> = {
      'objective': '',
      'background': '',
      'scope': '',
      'requirements': '',
      'metrics': '',
      'access_permissions': '',
      'notifications': '',
      'reporting': '',
      'analytics_events': '',
      'filters': '',
      'dependencies': '',
      'backward_compatibility': '',
      'release_plan': '',
      'timeline': ''
    };
    
    // If assembled_text exists, parse it
    if (prd?.assembled_text) {
      const parsed = parseAssembledText(prd.assembled_text);
      Object.assign(sections, parsed);
    }
    
    // Also merge existing prd_sections
    (prd?.prd_sections || []).forEach((s: any) => {
      if (s.section_id && s.content) {
        sections[s.section_id] = s.content;
      }
    });
    
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
    // Use assembled_text if available, otherwise fall back to sections
    if (p.assembled_text) {
      let text = p.assembled_text;
      const createdDate = new Date(p.created_at).toLocaleDateString();
      const updatedDate = new Date(p.updated_at).toLocaleDateString();
      const createdByName = p.created_by_name || 'Unknown';
      
      // Replace PRD Created On - catch ALL variations (case-insensitive, any format)
      text = text.replace(/PRD Created On:\s*\([^)]*\)/gi, `PRD Created On: ${createdDate}`);
      text = text.replace(/PRD Created On:\s*\[[^\]]*\]/gi, `PRD Created On: ${createdDate}`);
      text = text.replace(/PRD Created On:\s*(Filled automatically|auto-filled)[^\n]*/gi, `PRD Created On: ${createdDate}`);
      // Replace PRD Updated On
      text = text.replace(/PRD Updated On:\s*\([^)]*\)/gi, `PRD Updated On: ${updatedDate}`);
      text = text.replace(/PRD Updated On:\s*\[[^\]]*\]/gi, `PRD Updated On: ${updatedDate}`);
      text = text.replace(/PRD Updated On:\s*(Filled automatically|auto-filled)[^\n]*/gi, `PRD Updated On: ${updatedDate}`);
      // Replace Created By
      text = text.replace(/Created By:\s*\([^)]*\)/gi, `Created By: ${createdByName}`);
      text = text.replace(/Created By:\s*\[[^\]]*\]/gi, `Created By: ${createdByName}`);
      text = text.replace(/Created By:\s*(Fetched from user|Filled automatically|auto-filled)[^\n]*/gi, `Created By: ${createdByName}`);
      
      return text;
    }
    
    // Fallback to individual sections
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

  if (!prd) return <div className="min-h-screen bg-[#050509] text-white p-8 transition-colors">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#050509] text-white flex flex-col lg:flex-row">
      {showMobileSidebar && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#06040d]/95 text-white backdrop-blur-2xl border-r border-white/10 transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-80'} ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:relative lg:h-auto lg:flex-shrink-0`}
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
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/prds')}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/70 hover:text-white"
                title="All PRDs"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.55em] text-white/40">Haven7</span>
                  <span className="text-2xl font-semibold tracking-tight text-white">PRD Document</span>
        </div>
                <p className="text-sm leading-relaxed text-white/55 max-w-xs">
                  Review details, iterate, and align on every decision inside your product requirements document.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="ghost"
                    onClick={() => { navigate('/prds'); setShowMobileSidebar(false); }}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white"
            >
                    <ArrowLeft className="mr-2 h-4 w-4" /> All PRDs
            </Button>
                  {!isEditing ? (
                    <Button
                      onClick={handleEdit}
                      className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/65 transition-colors hover:border-white/20 hover:bg-white/15 hover:text-white"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-full border border-white/20 bg-white/90 px-4 py-2 text-sm text-gray-900 transition-colors hover:bg-white"
                      >
                        <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving…' : `Save v${prd.version + 1}`}
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="mt-1 h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/70 hover:text-white"
                aria-label="Collapse sidebar"
              >
                <ArrowLeft className="h-4 w-4" />
            </Button>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.4em] text-white/35 mb-3">Summary</div>
              <div className="flex flex-col gap-2 text-sm text-white/60">
                <span>Version {prd.version}</span>
                <span>Updated {new Date(prd.updated_at).toLocaleString()}</span>
                {prd.change_summary && <span>Change • {prd.change_summary}</span>}
              </div>
            </section>

            {!isEditing && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="text-xs uppercase tracking-[0.4em] text-white/35">Utilities</div>
                <Button variant="ghost" className="justify-start rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white" onClick={copyMarkdown}>
                  <Copy className="mr-2 h-4 w-4" /> {copiedMarkdown ? 'Copied Markdown' : 'Copy Markdown'}
                </Button>
                <Button variant="ghost" className="justify-start rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white" onClick={downloadMarkdown}>
                  <Download className="mr-2 h-4 w-4" /> Download Markdown
                </Button>
                <Button variant="ghost" className="justify-start rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white" onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 1500);
                }}>
                  <Share className="mr-2 h-4 w-4" /> {copiedLink ? 'Link Copied' : 'Copy Link'}
                </Button>
              </section>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
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

        <main className="relative flex-1 overflow-y-auto px-6 pb-16 pt-4 sm:px-8 lg:px-10">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-white">{prd.title || 'Untitled PRD'}</h1>
            <p className="text-sm text-white/60">v{prd.version} • Updated {new Date(prd.updated_at).toLocaleString()}</p>
          </div>

          {showVersionHistory && !isEditing && (
            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Version History</h3>
              <div className="space-y-3">
                {versions.map((v, idx) => (
                  <div
                    key={v.id}
                    className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                      v.id === prd.id
                        ? 'border-white/20 bg-white/12 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/12 hover:text-white'
                    }`}
                    onClick={() => v.id !== prd.id && navigate(`/prd/${v.id}`)}
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          v{v.version}{' '}
                          {v.id === prd.id && (
                            <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-xs font-semibold">Current</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-white/60">{new Date(v.created_at).toLocaleDateString()}</p>
                        {v.change_summary && <p className="mt-1 text-xs text-white/50">{v.change_summary}</p>}
                      </div>
                      {v.id !== prd.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/prd/compare/${prd.id}/${v.id}`);
                          }}
                          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60 transition-colors hover:border-white/20 hover:bg-white/15 hover:text-white"
                        >
                          Compare
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isEditing && (
            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <label className="mb-2 block text-sm font-medium text-white">💬 What changed? (optional but recommended)</label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="e.g., Clarified success metrics, added Q2 timeline"
                className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </section>
          )}
 
          <div className="space-y-6">
            {SECTION_DEFINITIONS.map((section, index) => {
              const content = editedSections[section.id] ?? '';
              return (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.45em] text-white/40">Section {index + 1}</div>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{section.title}</h2>
                      </div>
          {!isEditing && (
            <Button
              variant="ghost"
                        size="icon"
                        className="rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4" />
            </Button>
          )}
                  </div>
                    {isEditing ? (
                      <textarea 
                        value={content} 
                        onChange={(e) => setEditedSections({ ...editedSections, [section.id]: e.target.value })} 
                      className="w-full min-h-[220px] rounded-xl border border-white/15 bg-white/5 p-4 text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                      placeholder={`Document the ${section.title.toLowerCase()}…`}
                      />
                    ) : (
                    <div className="prose prose-invert max-w-none text-white/85">
                        {content ? (
                        <ReactMarkdown>{content}</ReactMarkdown>
                      ) : (
                        <p className="italic text-white/40">No content yet.</p>
                        )}
                      </div>
                    )}
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}


