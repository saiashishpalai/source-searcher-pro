import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Copy, 
  Check,
  Clock,
  Settings,
  History,
  FileText,
  ChevronDown,
  ChevronRight,
  Slack
} from 'lucide-react';
import { WeeklyUpdateSettings } from '@/components/weekly-updates/WeeklyUpdateSettings';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Update {
  id: string;
  title: string;
  content: string;
  status: string;
  sent_at?: string;
  sent_to?: string;
  created_at: string;
}

export default function WeeklyUpdates() {
  const navigate = useNavigate();
  const [currentUpdate, setCurrentUpdate] = useState<Update | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [history, setHistory] = useState<Update[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasChannel, setHasChannel] = useState(false);

  useEffect(() => {
    loadHistory();
    checkChannel();
  }, []);

  const loadHistory = async () => {
    try {
      const { updates } = await ApiClient.getWeeklyUpdateHistory(5);
      setHistory(updates);
      
      // If there's a recent draft, load it
      const recentDraft = updates.find(u => u.status === 'draft');
      if (recentDraft) {
        setCurrentUpdate(recentDraft);
        setEditedContent(recentDraft.content);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const checkChannel = async () => {
    try {
      const { settings } = await ApiClient.getWeeklyUpdateSettings();
      setHasChannel(!!settings?.slack_channel_id);
    } catch (error) {
      console.error('Failed to check channel:', error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { update } = await ApiClient.generateWeeklyUpdate();
      setCurrentUpdate(update);
      setEditedContent(update.content);
      await loadHistory();
    } catch (error) {
      console.error('Failed to generate update:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentUpdate) return;
    
    setIsSaving(true);
    try {
      const { update } = await ApiClient.updateWeeklyUpdateDraft(currentUpdate.id, editedContent);
      setCurrentUpdate(update);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToSlack = async () => {
    if (!currentUpdate) return;
    
    // Save any edits first
    if (editedContent !== currentUpdate.content) {
      await handleSaveDraft();
    }
    
    setIsSending(true);
    try {
      await ApiClient.sendWeeklyUpdateToSlack(currentUpdate.id);
      await loadHistory();
      setCurrentUpdate(null);
      setEditedContent('');
    } catch (error) {
      console.error('Failed to send to Slack:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadUpdate = async (id: string) => {
    try {
      const { update } = await ApiClient.getWeeklyUpdate(id);
      setCurrentUpdate(update);
      setEditedContent(update.content);
    } catch (error) {
      console.error('Failed to load update:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="pl-0 text-white/40 hover:text-white mb-2 h-auto hover:bg-transparent"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              <FileText className="h-6 w-6 text-white/60" />
              Weekly Updates
            </h1>
            <p className="text-sm text-white/60">
              Generate and send status updates to your team
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Settings Panel (collapsible) */}
        {showSettings && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <WeeklyUpdateSettings 
              onSettingsSaved={() => checkChannel()} 
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Editor Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">
                    {currentUpdate ? currentUpdate.title : 'New Update'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {currentUpdate && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          currentUpdate.status === 'sent' 
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-white/5 text-white/60 border-white/10"
                        )}
                      >
                        {currentUpdate.status === 'sent' ? 'Sent' : 'Draft'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentUpdate ? (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white/80 mb-2">
                      Generate Your Weekly Update
                    </h3>
                    <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                      AI will analyze your Jira tickets and PRD progress to create a
                      stakeholder-friendly status update.
                    </p>
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="bg-white/10 hover:bg-white/20 text-white"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Update
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Your weekly update content..."
                      className="min-h-[400px] bg-white/5 border-white/10 text-white font-mono text-sm resize-none"
                      disabled={currentUpdate.status === 'sent'}
                    />
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-1.5 text-green-400" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1.5" />
                              Copy
                            </>
                          )}
                        </Button>
                        
                        {currentUpdate.status === 'draft' && editedContent !== currentUpdate.content && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            ) : null}
                            Save Draft
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        >
                          {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1.5" />
                          )}
                          Regenerate
                        </Button>
                        
                        {currentUpdate.status === 'draft' && (
                          <Button
                            onClick={handleSendToSlack}
                            disabled={isSending || !hasChannel}
                            className={cn(
                              "bg-[#4A154B] hover:bg-[#611F69] text-white",
                              !hasChannel && "opacity-50 cursor-not-allowed"
                            )}
                            title={!hasChannel ? "Select a Slack channel in settings first" : "Send to Slack"}
                          >
                            {isSending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            ) : (
                              <Slack className="h-4 w-4 mr-1.5" />
                            )}
                            Send to Slack
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {!hasChannel && currentUpdate.status === 'draft' && (
                      <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                        <Settings className="h-3 w-3" />
                        Select a Slack channel in settings to enable direct posting
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Panel */}
          <div className="space-y-4">
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-4">
                    No updates yet
                  </p>
                ) : (
                  history.map((update) => (
                    <button
                      key={update.id}
                      onClick={() => loadUpdate(update.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors",
                        currentUpdate?.id === update.id
                          ? "bg-white/10 border border-white/20"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white/80 truncate">
                          {update.title}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] shrink-0 ml-2",
                            update.status === 'sent' 
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-white/5 text-white/40 border-white/10"
                          )}
                        >
                          {update.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Clock className="h-3 w-3" />
                        {new Date(update.created_at).toLocaleDateString()}
                        {update.sent_to && (
                          <span className="text-white/30">→ {update.sent_to}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-4">
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">
                  Tips
                </h4>
                <ul className="space-y-2 text-xs text-white/40">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    Updates are generated from your active Jira tickets
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Edit the content before sending for a personal touch
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    Use "Copy" to paste into email if preferred
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

