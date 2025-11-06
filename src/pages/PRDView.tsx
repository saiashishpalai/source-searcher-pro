import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, X, Clock, Copy, Download, Share, Check, FileText, Loader2 } from 'lucide-react';
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
  const [isGeneratingAssembled, setIsGeneratingAssembled] = useState(false);

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

        {/* Show button to generate assembled PRD if it doesn't exist */}
        {!prd.assembled_text && !isEditing && (prd.prd_sections || []).length >= 5 && (
          <div className="mb-8 p-6 bg-[#1f1f23] border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Generate Complete PRD Document</h3>
                <p className="text-sm text-gray-400">This PRD only has 5 sections. Generate the full 14-section PRD document with all sections filled.</p>
              </div>
              <Button 
                onClick={async () => {
                  setIsGeneratingAssembled(true);
                  try {
                    const sections: Record<string, string> = {};
                    (prd.prd_sections || []).forEach((s: any) => { sections[s.section_id] = s.content; });
                    const allCitationIds: string[] = [];
                    // Collect citations if available
                    await ApiClient.assemblePRD(prd.id, {
                      objective: sections.objective || '',
                      scope: sections.scope || '',
                      metrics: sections.metrics || '',
                      dependencies: sections.dependencies || '',
                      timeline: sections.timeline || ''
                    }, allCitationIds);
                    await fetchPRD(); // Refresh to show assembled text
                  } catch (err) {
                    console.error('Failed to generate assembled PRD:', err);
                    alert('Failed to generate PRD document. Please try again.');
                  } finally {
                    setIsGeneratingAssembled(false);
                  }
                }}
                disabled={isGeneratingAssembled}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {isGeneratingAssembled ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Full PRD
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Show assembled PRD if it exists, otherwise show individual sections */}
        {prd.assembled_text && !isEditing ? (
          <div className="p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
            <div className="prose prose-invert max-w-none text-gray-300">
              <ReactMarkdown>{(() => {
                let text = prd.assembled_text || '';
                const createdDate = new Date(prd.created_at).toLocaleDateString();
                const updatedDate = new Date(prd.updated_at).toLocaleDateString();
                const createdByName = prd.created_by_name || 'Unknown';
                
                // Replace PRD Created On - catch ALL variations (case-insensitive, any format)
                // Match anything in parentheses or brackets after the label
                text = text.replace(/PRD Created On:\s*\([^)]*\)/gi, `PRD Created On: ${createdDate}`);
                text = text.replace(/PRD Created On:\s*\[[^\]]*\]/gi, `PRD Created On: ${createdDate}`);
                // Also catch if there's no brackets/parentheses but has placeholder text
                text = text.replace(/PRD Created On:\s*(Filled automatically|auto-filled)[^\n]*/gi, `PRD Created On: ${createdDate}`);
                // Replace PRD Updated On
                text = text.replace(/PRD Updated On:\s*\([^)]*\)/gi, `PRD Updated On: ${updatedDate}`);
                text = text.replace(/PRD Updated On:\s*\[[^\]]*\]/gi, `PRD Updated On: ${updatedDate}`);
                text = text.replace(/PRD Updated On:\s*(Filled automatically|auto-filled)[^\n]*/gi, `PRD Updated On: ${updatedDate}`);
                // Replace Created By
                text = text.replace(/Created By:\s*\([^)]*\)/gi, `Created By: ${createdByName}`);
                text = text.replace(/Created By:\s*\[[^\]]*\]/gi, `Created By: ${createdByName}`);
                text = text.replace(/Created By:\s*(Fetched from user|Filled automatically|auto-filled)[^\n]*/gi, `Created By: ${createdByName}`);
                
                // Debug: log if replacements didn't work
                if (text.includes('Filled automatically') || text.includes('auto-filled') || text.includes('Fetched from user')) {
                  console.warn('Some metadata placeholders were not replaced:', text.match(/(PRD Created On|PRD Updated On|Created By):\s*[^\n]*/gi));
                }
                
                return text;
              })()}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              // Define all 14 sections in order
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
              if (prd.assembled_text) {
                parsedSections = parseAssembledText(prd.assembled_text);
              }

              // Merge: use parsed sections if available, otherwise use existing sections
              const allSectionsContent: Record<string, string> = {};
              allSections.forEach(section => {
                allSectionsContent[section.id] = parsedSections[section.id] || existingSectionsMap.get(section.id) || '';
              });

              return allSections.map((section) => {
                const content = isEditing 
                  ? (editedSections[section.id] !== undefined ? editedSections[section.id] : allSectionsContent[section.id])
                  : allSectionsContent[section.id];

                return (
                  <div key={section.id} className="p-6 bg-[#1f1f23] border border-gray-700 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-purple-400">{section.title}</h2>
                    {isEditing ? (
                      <textarea 
                        value={content} 
                        onChange={(e) => setEditedSections({ ...editedSections, [section.id]: e.target.value })} 
                        className="w-full h-48 bg-[#0f0f11] border border-gray-700 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-purple-500" 
                        placeholder={`Enter ${section.title.toLowerCase()}...`}
                      />
                    ) : (
                      <div className="prose prose-invert max-w-none">
                        {content ? (
                          <ReactMarkdown>{content}</ReactMarkdown>
                        ) : (
                          <p className="text-gray-500 italic">No content for this section yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

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


