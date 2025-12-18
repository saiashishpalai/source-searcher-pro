import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, X, Clock, Copy, Download, Share, Check, Menu, Sparkles, Loader2, Image as ImageIcon, Mic, Square, RotateCcw, Plus, Send, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ApiClient } from '@/lib/api-client';
import { WireframeUpload } from '@/components/WireframeUpload';
import { analytics } from '@/lib/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [editedTitle, setEditedTitle] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [requirementsWireframe, setRequirementsWireframe] = useState<{ file: File; preview: string; storageUrl?: string } | null>(null);
  const [isGeneratingFromWireframe, setIsGeneratingFromWireframe] = useState(false);
  const [generatedRequirements, setGeneratedRequirements] = useState<string | null>(null);
  const [generatedConfidence, setGeneratedConfidence] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Mic and AI features for section editing
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftMode, setDraftMode] = useState<'insert' | 'replace'>('replace');
  const [currentEditingSection, setCurrentEditingSection] = useState<SectionId | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
    const sectionPattern = /\*\*(\d+)\.\s*([^*]+?)\*\*\s*\n\s*\n([\s\S]+?)(?=\n\s*\n\*\*\d+\.|$)/g;
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
          const regex = new RegExp(`\\*\\*[^\\*]*${keyword}[^\\*]*\\*\\*\\s*\\n\\s*\\n([\\s\\S]+?)(?=\\n\\s*\\n\\*\\*|$)`, 'i');
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

  const handleEdit = () => {
    setEditedTitle(prd?.title || '');
    setIsEditing(true);
  };
  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle('');
    setChangeSummary('');
    setEditingRequirements(false);
    setRequirementsWireframe(null);
    setGeneratedRequirements(null);
    setGeneratedConfidence(null);
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

  const handleWireframeUpload = (file: File, preview: string, storageUrl: string) => {
    setRequirementsWireframe({ file, preview, storageUrl });
    toast({
      title: 'Wireframe uploaded',
      description: 'Click "Generate Requirements" to analyze the wireframe.',
    });
  };

  const handleWireframeRemove = () => {
    setRequirementsWireframe(null);
    setGeneratedRequirements(null);
    setGeneratedConfidence(null);
  };

  // Mic recording handlers
  const startRecording = async (sectionId: SectionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setCurrentEditingSection(sectionId);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob, sectionId);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: 'Recording started',
        description: 'Speak your thoughts...',
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to use voice input.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob, sectionId: SectionId) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const result = await ApiClient.transcribeAudio(formData);
      const transcript = result.text || '';
      
      // Apply based on draft mode
      if (draftMode === 'replace') {
        setEditedSections({ ...editedSections, [sectionId]: transcript });
      } else {
        const current = editedSections[sectionId] || '';
        setEditedSections({ ...editedSections, [sectionId]: current + '\n\n' + transcript });
      }
      
      toast({
        title: 'Transcription complete',
        description: `Added to ${SECTION_DEFINITIONS.find(s => s.id === sectionId)?.title}`,
      });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: 'Transcription failed',
        description: 'Could not transcribe audio. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
      setCurrentEditingSection(null);
    }
  };

  // AI draft generation
  const generateAIDraft = async (sectionId: SectionId) => {
    setIsGeneratingDraft(true);
    setCurrentEditingSection(sectionId);
    
    try {
      // Prepare context from the entire PRD
      const context = {
        objective: editedSections.objective || prd?.objective || '',
        background: editedSections.background || prd?.background || '',
        scope: editedSections.scope || prd?.scope || '',
        requirements: editedSections.requirements || prd?.requirements || '',
        currentSection: editedSections[sectionId] || '',
        sectionTitle: SECTION_DEFINITIONS.find(s => s.id === sectionId)?.title || sectionId,
      };
      
      // Call the draft generation API
      const result = await ApiClient.generateSectionDraft(sectionId, context);
      const draft = result.draft || '';
      
      // Apply based on draft mode
      if (draftMode === 'replace') {
        setEditedSections({ ...editedSections, [sectionId]: draft });
      } else {
        const current = editedSections[sectionId] || '';
        setEditedSections({ ...editedSections, [sectionId]: current + '\n\n' + draft });
      }
      
      toast({
        title: 'AI draft generated',
        description: `Enhanced ${SECTION_DEFINITIONS.find(s => s.id === sectionId)?.title}`,
      });
    } catch (error) {
      console.error('AI draft generation error:', error);
      toast({
        title: 'Draft generation failed',
        description: 'Could not generate AI draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDraft(false);
      setCurrentEditingSection(null);
    }
  };

  const handleGenerateRequirementsFromWireframe = async () => {
    if (!requirementsWireframe || !id) return;

    setIsGeneratingFromWireframe(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(requirementsWireframe.file);

      const base64Data = await base64Promise;

      // Prepare existing PRD context
      const existingPRD = {
        objective: editedSections.objective || '',
        background: editedSections.background || '',
        scope: editedSections.scope || '',
        requirements: editedSections.requirements || ''
      };

      // Track analytics
      analytics.trackGenerationStart(
        !!(existingPRD.objective || existingPRD.background),
        false
      );

      // Call API
      const result = await ApiClient.regenerateRequirementsFromWireframe(
        id,
        base64Data,
        existingPRD
      );

      setGeneratedRequirements(result.requirements);
      setGeneratedConfidence(result.confidence);

      // Track success
      analytics.trackGenerationSuccess(
        result.confidence,
        result.metadata.word_count || 0,
        result.metadata.components_detected || 0
      );

      // Show confidence toast
      if (result.confidence < 70) {
        toast({
          title: `Requirements generated (${result.confidence}% confidence)`,
          description: 'The generated requirements may need review. Please validate the details.',
        });
      } else {
        toast({
          title: `Requirements generated (${result.confidence}% confidence)`,
          description: 'Review the generated requirements and choose an action below.',
        });
      }
    } catch (error: any) {
      console.error('Generate from wireframe error:', error);
      analytics.trackGenerationFailure(error.message || 'Unknown error');
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate requirements from wireframe',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingFromWireframe(false);
    }
  };

  const handleReplaceRequirements = () => {
    if (generatedRequirements) {
      setEditedSections(prev => ({ ...prev, requirements: generatedRequirements }));
      toast({
        title: 'Requirements replaced',
        description: 'The requirements section has been replaced with the generated content.',
      });
      setEditingRequirements(false);
      setRequirementsWireframe(null);
      setGeneratedRequirements(null);
      setGeneratedConfidence(null);
    }
  };

  const handleInsertRequirements = () => {
    if (generatedRequirements) {
      const existingRequirements = editedSections.requirements || '';
      const separator = existingRequirements ? '\n\n---\n\n' : '';
      setEditedSections(prev => ({
        ...prev,
        requirements: existingRequirements + separator + generatedRequirements
      }));
      toast({
        title: 'Requirements inserted',
        description: 'The generated requirements have been added below existing content.',
      });
      setEditingRequirements(false);
      setRequirementsWireframe(null);
      setGeneratedRequirements(null);
      setGeneratedConfidence(null);
    }
  };

  const handleCancelGeneration = () => {
    setGeneratedRequirements(null);
    setGeneratedConfidence(null);
    setRequirementsWireframe(null);
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      // Update title if it changed
      if (editedTitle.trim() && editedTitle.trim() !== prd?.title) {
        await ApiClient.updatePRDTitle(id, editedTitle.trim());
      }
      
      // Save all sections to current version (stays as draft)
      for (const [sectionId, content] of Object.entries(editedSections)) {
        await ApiClient.savePRDSection(id, sectionId as SectionId, content || '');
      }
      
      // Refresh PRD data
      await fetchPRD();
      
      setIsEditing(false);
      setEditedTitle('');
      setChangeSummary('');
      
      toast({
        title: 'Changes saved',
        description: 'Your edits have been saved. Click Publish when ready.',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to save PRD',
        description: error.message || 'Could not save PRD. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !prd) return;
    setIsSaving(true);
    try {
      // First, save any pending changes
      if (editedTitle.trim() && editedTitle.trim() !== prd?.title) {
        await ApiClient.updatePRDTitle(id, editedTitle.trim());
      }
      
      // Save all sections to current version
      for (const [sectionId, content] of Object.entries(editedSections)) {
        await ApiClient.savePRDSection(id, sectionId as SectionId, content || '');
      }
      
      // Publish the current version
      await ApiClient.updatePRDStatus(id, 'published');
      
      // Refresh PRD data to show updated status
      await fetchPRD();
      
      // Create a new version automatically (for continued editing)
      const { prd: newPrd } = await ApiClient.createPRDVersion(id, changeSummary || 'Published and created new version');
      
      // Copy title to new version if it was changed
      if (editedTitle.trim() && editedTitle.trim() !== prd?.title) {
        await ApiClient.updatePRDTitle(newPrd.id, editedTitle.trim());
      }
      
      // Copy all sections to the new version
      for (const [sectionId, content] of Object.entries(editedSections)) {
        await ApiClient.savePRDSection(newPrd.id, sectionId as SectionId, content || '');
      }
      
      setIsEditing(false);
      setEditedTitle('');
      setChangeSummary('');
      
      // Show published status briefly, then navigate to new version
      toast({
        title: 'PRD Published',
        description: `Version ${prd.version} has been published. You're now editing version ${newPrd.version}.`,
      });
      
      // Navigate to the new version (draft) after a short delay to show published status
      setTimeout(() => {
        navigate(`/prd/${newPrd.id}`);
      }, 1500);
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: 'Failed to publish PRD',
        description: error.message || 'Could not publish PRD. Please try again.',
        variant: 'destructive',
      });
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
            <div className="flex items-start justify-between gap-4 min-w-0">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="inline-flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.55em] text-white/40">Haven7</span>
                  <span className="text-2xl font-semibold tracking-tight text-white">PRD Document</span>
        </div>
                <p className="text-sm leading-relaxed text-white/55 max-w-xs">
                  Review details, iterate, and align on every decision inside your product requirements document.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="ghost"
                    onClick={() => { navigate('/prds'); setShowMobileSidebar(false); }}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white"
            >
                    <ArrowLeft className="mr-2 h-4 w-4" /> All PRDs
            </Button>
                  {!isEditing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={handleEdit}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white/65 transition-colors hover:border-white/20 hover:bg-white/15 hover:text-white whitespace-nowrap"
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Edit
                      </Button>
                      {prd?.status === 'draft' ? (
                        <Button
                          onClick={handlePublish}
                          disabled={isSaving}
                          className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs sm:text-sm text-green-400 transition-colors hover:bg-green-500/20 hover:border-green-500/50 whitespace-nowrap"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4 animate-spin" /> Publishing…
                            </>
                          ) : (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Publish
                            </>
                          )}
                        </Button>
                      ) : prd?.status === 'published' || prd?.status === 'ready_for_execution' ? (
                        <>
                          {prd?.status === 'published' && (
                            <Button
                              disabled
                              className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs sm:text-sm text-green-400 opacity-100 cursor-default whitespace-nowrap"
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Published
                            </Button>
                          )}
                          <Button
                            onClick={() => navigate(`/prd/${id}/execution`)}
                            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs sm:text-sm text-blue-400 transition-colors hover:bg-blue-500/20 hover:border-blue-500/50 whitespace-nowrap"
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">View </span>Execution
                          </Button>
                        </>
                      ) : null}
                    </div>
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
                        <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving…' : 'Save'}
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
            <div className="flex items-center gap-3 flex-wrap">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="PRD Title"
                  className="text-3xl font-semibold text-white bg-transparent border-b-2 border-white/20 focus:border-white/40 focus:outline-none pb-2 transition-colors"
                  autoFocus
                />
              ) : (
                <h1 className="text-3xl font-semibold text-white">{prd.title || 'Untitled PRD'}</h1>
              )}
              {prd?.status === 'published' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                  <Check className="w-3 h-3" />
                  Published
                </span>
              )}
              {isEditing && prd?.status === 'draft' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Edit className="w-3 h-3" />
                  Draft
                </span>
              )}
            </div>
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
              const isRequirements = section.id === 'requirements';
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
                        onClick={() => {
                          if (isRequirements) {
                            setEditingRequirements(true);
                          }
                          setIsEditing(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
            </Button>
          )}
                  </div>
                    {isEditing ? (
                      isRequirements && editingRequirements ? (
                        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-1">
                          <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white/5">
                              <TabsTrigger value="manual">Manual Edit</TabsTrigger>
                              <TabsTrigger value="wireframe">Generate from Wireframe</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="p-4">
                              <div className="rounded-xl border border-white/15 bg-white/[0.03] overflow-hidden">
                                {/* Editor Toolbar */}
                                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/10">
                                  <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => isRecording && currentEditingSection === 'requirements' ? stopRecording() : startRecording('requirements')}
                                            disabled={isTranscribing || (isRecording && currentEditingSection !== 'requirements')}
                                            className={`h-8 px-3 rounded-md border transition-colors ${
                                              isRecording && currentEditingSection === 'requirements'
                                                ? 'border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                                : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                            }`}
                                          >
                                            {isRecording && currentEditingSection === 'requirements' ? (
                                              <><Square className="h-3.5 w-3.5 mr-1.5 fill-current" /> Stop</>
                                            ) : isTranscribing && currentEditingSection === 'requirements' ? (
                                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Transcribing...</>
                                            ) : (
                                              <><Mic className="h-3.5 w-3.5 mr-1.5" /> Voice</>
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Record voice input for requirements</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => generateAIDraft('requirements')}
                                            disabled={isGeneratingDraft || isRecording || isTranscribing}
                                            className="h-8 px-3 rounded-md border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                          >
                                            {isGeneratingDraft && currentEditingSection === 'requirements' ? (
                                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                                            ) : (
                                              <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Improve with AI</>
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Generate AI-enhanced requirements draft</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>

                                  {/* Insert/Replace Mode Toggle */}
                                  <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 p-0.5">
                                    <button
                                      onClick={() => setDraftMode('replace')}
                                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                        draftMode === 'replace'
                                          ? 'bg-white/15 text-white'
                                          : 'text-white/50 hover:text-white/70'
                                      }`}
                                    >
                                      <RotateCcw className="inline h-3 w-3 mr-1" />
                                      Replace
                                    </button>
                                    <button
                                      onClick={() => setDraftMode('insert')}
                                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                        draftMode === 'insert'
                                          ? 'bg-white/15 text-white'
                                          : 'text-white/50 hover:text-white/70'
                                      }`}
                                    >
                                      <Plus className="inline h-3 w-3 mr-1" />
                                      Insert
                                    </button>
                                  </div>
                                </div>

                                {/* Textarea */}
                                <textarea 
                                  value={content} 
                                  onChange={(e) => setEditedSections({ ...editedSections, [section.id]: e.target.value })} 
                                  className="w-full min-h-[220px] bg-transparent p-4 text-white focus:outline-none resize-y"
                                  placeholder={`Document the ${section.title.toLowerCase()}…`}
                                />
                              </div>
                            </TabsContent>
                            <TabsContent value="wireframe" className="p-4 space-y-4">
                              <p className="text-sm text-white/60">Upload a wireframe to generate detailed requirements automatically.</p>
                              
                              <WireframeUpload
                                onUpload={handleWireframeUpload}
                                onRemove={handleWireframeRemove}
                                uploadedFile={requirementsWireframe}
                                maxSizeMB={10}
                                acceptedFormats={['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']}
                              />

                              {requirementsWireframe && !generatedRequirements && (
                                <Button
                                  onClick={handleGenerateRequirementsFromWireframe}
                                  disabled={isGeneratingFromWireframe}
                                  className="w-full rounded-md border border-white/15 bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white"
                                >
                                  {isGeneratingFromWireframe ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Analyzing wireframe...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Generate Requirements
                                    </>
                                  )}
                                </Button>
                              )}

                              {generatedRequirements && (
                                <div className="space-y-4">
                                  <div className="rounded-lg border border-white/15 bg-white/[0.03] p-4 max-h-96 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-sm font-medium text-white">Generated Requirements</p>
                                      {generatedConfidence !== null && (
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          generatedConfidence >= 70 
                                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                            : generatedConfidence >= 50
                                            ? 'bg-amber-400/10 text-amber-200 border border-amber-400/30'
                                            : 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
                                        }`}>
                                          {generatedConfidence}% confidence
                                        </span>
                                      )}
                                    </div>
                                    <div className="prose prose-sm prose-invert max-w-none text-white/85">
                                      <ReactMarkdown>{generatedRequirements}</ReactMarkdown>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={handleReplaceRequirements}
                                      className="flex-1 rounded-md border border-white/15 bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white"
                                    >
                                      Replace All
                                    </Button>
                                    <Button
                                      onClick={handleInsertRequirements}
                                      variant="outline"
                                      className="flex-1 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                                    >
                                      Insert Below
                                    </Button>
                                    <Button
                                      onClick={handleCancelGeneration}
                                      variant="ghost"
                                      className="rounded-md px-4 py-2 text-sm text-white/60 hover:text-white"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/15 bg-white/[0.03] overflow-hidden">
                          {/* Editor Toolbar */}
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => isRecording && currentEditingSection === section.id ? stopRecording() : startRecording(section.id as SectionId)}
                                      disabled={isTranscribing || (isRecording && currentEditingSection !== section.id)}
                                      className={`h-8 px-3 rounded-md border transition-colors ${
                                        isRecording && currentEditingSection === section.id
                                          ? 'border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                          : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                      }`}
                                    >
                                      {isRecording && currentEditingSection === section.id ? (
                                        <><Square className="h-3.5 w-3.5 mr-1.5 fill-current" /> Stop</>
                                      ) : isTranscribing && currentEditingSection === section.id ? (
                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Transcribing...</>
                                      ) : (
                                        <><Mic className="h-3.5 w-3.5 mr-1.5" /> Voice</>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Record voice input for this section</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => generateAIDraft(section.id as SectionId)}
                                      disabled={isGeneratingDraft || isRecording || isTranscribing}
                                      className="h-8 px-3 rounded-md border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                      {isGeneratingDraft && currentEditingSection === section.id ? (
                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                                      ) : (
                                        <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Improve with AI</>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Generate AI-enhanced draft for this section</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            {/* Insert/Replace Mode Toggle */}
                            <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 p-0.5">
                              <button
                                onClick={() => setDraftMode('replace')}
                                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                  draftMode === 'replace'
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/50 hover:text-white/70'
                                }`}
                              >
                                <RotateCcw className="inline h-3 w-3 mr-1" />
                                Replace
                              </button>
                              <button
                                onClick={() => setDraftMode('insert')}
                                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                  draftMode === 'insert'
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/50 hover:text-white/70'
                                }`}
                              >
                                <Plus className="inline h-3 w-3 mr-1" />
                                Insert
                              </button>
                            </div>
                          </div>

                          {/* Textarea */}
                          <textarea 
                            value={content} 
                            onChange={(e) => setEditedSections({ ...editedSections, [section.id]: e.target.value })} 
                            className="w-full min-h-[220px] bg-transparent p-4 text-white focus:outline-none resize-y"
                            placeholder={`Document the ${section.title.toLowerCase()}…`}
                          />
                        </div>
                      )
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


