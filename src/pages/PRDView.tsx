import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, X, Clock, Copy, Download, Share, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ApiClient } from '@/lib/api-client';

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

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8 p-6 bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-card/80 transition-all duration-300">
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
          <div className="mb-8 p-6 bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <h3 className="font-semibold mb-4 text-foreground">Version History</h3>
            <div className="space-y-3">
              {versions.map((v, idx) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-lg border transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
                    v.id === prd.id
                      ? 'bg-primary/10 border-primary/30 shadow-primary/5'
                      : 'bg-background/50 border-border/50 hover:border-primary/30 hover:bg-background/70'
                  }`}
                  onClick={() => v.id !== prd.id && navigate(`/prd/${v.id}`)}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        v{v.version} {v.id === prd.id && (<span className="ml-2 text-xs text-primary font-semibold">Current</span>)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                      {v.change_summary && (<p className="text-xs text-muted-foreground/80 mt-1">{v.change_summary}</p>)}
                    </div>
                    {v.id !== prd.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/prd/compare/${prd.id}/${v.id}`);
                        }}
                        className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      >
                        Compare
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div className="mb-8 p-6 bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <label className="block text-sm font-medium text-foreground mb-2">💬 What changed? (optional but recommended)</label>
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="e.g., Clarified success metrics, added Q2 timeline"
              className="w-full bg-background/50 border border-border/50 rounded-lg p-3 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/50"
            />
          </div>
        )}


        {/* Always use the same rendering structure - parse assembled_text if available, otherwise use individual sections */}
        <div className="space-y-6">
          {(() => {
            // Define all 14 sections in order (same as edit mode)
            const allSections = [
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

            // Create a map of existing sections from prd_sections
            const existingSectionsMap = new Map();
            (prd.prd_sections || []).forEach((section: any) => {
              existingSectionsMap.set(section.section_id, section.content);
            });

            // If assembled_text exists, parse it to extract all sections
            let parsedSections: Record<string, string> = {};
            if (prd.assembled_text && !isEditing) {
              parsedSections = parseAssembledText(prd.assembled_text);
            }

            // Merge: use parsed sections if available, otherwise use existing sections
            const allSectionsContent: Record<string, string> = {};
            allSections.forEach(section => {
              allSectionsContent[section.id] = parsedSections[section.id] || existingSectionsMap.get(section.id) || '';
            });

            // Get content for each section (use editedSections if editing)
            return allSections.map((section, index) => {
              const content = isEditing 
                ? (editedSections[section.id] !== undefined ? editedSections[section.id] : allSectionsContent[section.id])
                : allSectionsContent[section.id];

              // EXACT same rendering as edit mode
              return (
                <div
                  key={section.id}
                  className="group relative bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 ease-in-out hover:scale-[1.01] hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  
                  {/* Section Header - EXACT same as edit mode */}
                  <div className="relative z-10 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                        {section.title}
                      </h2>
                    </div>
                    <div className="h-px bg-gradient-to-r from-primary/50 via-primary/20 to-transparent ml-11" />
                  </div>
                  
                  {/* Section Content - EXACT same as edit mode */}
                  <div className="relative z-10">
                    {isEditing ? (
                      <textarea 
                        value={content} 
                        onChange={(e) => setEditedSections({ ...editedSections, [section.id]: e.target.value })} 
                        className="w-full min-h-[200px] bg-background/50 border border-border/50 rounded-lg p-4 text-foreground resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/50" 
                        placeholder={`Enter ${section.title.toLowerCase()}...`}
                      />
                    ) : (
                      <div className="prose prose-invert max-w-none text-foreground/90">
                        {content ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
                              ul: ({ children }) => <ul className="mb-4 ml-6 space-y-2 list-disc">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-4 ml-6 space-y-2 list-decimal">{children}</ol>,
                              li: ({ children }) => <li className="leading-7">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                              em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                              code: ({ children }) => (
                                <code className="px-2 py-1 bg-muted/50 rounded text-sm font-mono text-primary">
                                  {children}
                                </code>
                              ),
                              h3: ({ children }) => <h3 className="text-lg font-semibold mt-6 mb-3 text-foreground">{children}</h3>,
                              h4: ({ children }) => <h4 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h4>,
                            }}
                          >
                            {content}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-muted-foreground italic py-4">No content for this section yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
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


