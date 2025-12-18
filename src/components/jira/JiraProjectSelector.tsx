import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FolderKanban, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: Record<string, string>;
}

interface JiraProjectSelectorProps {
  currentProject?: { key: string; name: string } | null;
  onProjectSelected?: (project: { key: string; name: string }) => void;
  compact?: boolean;
}

export function JiraProjectSelector({ 
  currentProject, 
  onProjectSelected,
  compact = false 
}: JiraProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(currentProject?.key || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    setSelectedKey(currentProject?.key || '');
  }, [currentProject]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const { projects } = await ApiClient.getJiraProjects();
      setProjects(projects);
    } catch (error: any) {
      console.error('Failed to load Jira projects:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load Jira projects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    setHasChanges(key !== currentProject?.key);
  };

  const handleSave = async () => {
    if (!selectedKey) return;

    try {
      setIsSaving(true);
      const { project } = await ApiClient.selectJiraProject(selectedKey);
      toast({
        title: 'Project Selected',
        description: `${project.name} is now your default project.`,
      });
      setHasChanges(false);
      onProjectSelected?.(project);
    } catch (error: any) {
      console.error('Failed to select project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to select project',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading projects...
      </div>
    );
  }

  if (compact) {
    return (
      <Select value={selectedKey} onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.key}>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.key}</span>
                <span className="text-muted-foreground">- {project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={selectedKey} onValueChange={handleSelect}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a default project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.key}>
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{project.key}</span>
                  <span className="text-muted-foreground">- {project.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !selectedKey}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {projects.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">
          No projects found. Make sure you have access to at least one Jira project.
        </p>
      )}
    </div>
  );
}

