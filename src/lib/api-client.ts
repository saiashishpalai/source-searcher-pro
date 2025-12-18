import { supabase } from '@/integrations/supabase/client';
import { getEnvVar } from './env';

// Use relative URL in development to go through Vite proxy
// In production, use the full API URL
// If VITE_API_URL is set in dev, use it (for manual override)
const API_BASE_URL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || '') 
  : (getEnvVar('VITE_API_URL') || 'https://source-searcher-pro.onrender.com');

export class ApiClient {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      }),
    };
  }

  static async post<T = any>(endpoint: string, data: any, signal?: AbortSignal): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
      signal, // Support abort signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  static async get<T = any>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  static async delete<T = any>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  static async patch<T = any>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // PRD management
  static async createPRD(title: string): Promise<{ prd: any }> {
    return this.post('/api/prd/create', { title });
  }

  static async savePRDSection(prdVersionId: string, sectionId: string, content: string, metadata?: Record<string, any>, citationChunkIds?: string[]): Promise<{ section: any }> {
    return this.post('/api/prd/sections', { prd_version_id: prdVersionId, section_id: sectionId, content, metadata, citation_chunk_ids: citationChunkIds });
  }

  static async suggestPRDSection(prdVersionId: string, sectionId: string, userText: string, chunkIds?: string[]): Promise<{ draft: string; citations: string[] }> {
    return this.post('/api/prd/sections/suggest', { prd_version_id: prdVersionId, section_id: sectionId, user_text: userText, chunk_ids: chunkIds || [] });
  }

  static async assemblePRD(
    prdVersionId: string,
    sections: {
      objective?: string;
      background?: string;
      scope?: string;
      requirements?: string;
      metrics?: string;
      dependencies?: string;
      timeline?: string;
    },
    citations?: string[]
  ): Promise<{
    prd_text: string;
    structured_sections?: any[];
    summary?: any;
    citations_used: string[];
  }> {
    return this.post('/api/prd/assemble', { 
      prd_version_id: prdVersionId, 
      sections, 
      citations: citations || [] 
    });
  }

  static async transcribeSpeech(file: File | Blob, language: string = 'en'): Promise<{ text: string; duration_ms?: number }> {
    const form = new FormData();
    form.append('audio', file);
    form.append('language', language); // Always send language (defaults to 'en')
    
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
      method: 'POST',
      headers,
      body: form,
      credentials: 'include',
    });
    
    if (!response.ok) {
      let err: any = {};
      try { err = await response.json(); } catch {}
      throw new Error(err?.message || 'Transcription failed');
    }
    return response.json();
  }

  static async getPRD(prdId: string): Promise<{ prd: any }> {
    return this.get(`/api/prd/${prdId}`);
  }

  static async listPRDs(): Promise<{ prds: any[] }> {
    return this.get('/api/prd/list');
  }

  static async createPRDVersion(prdId: string, changeSummary?: string): Promise<{ prd: any }> {
    return this.post(`/api/prd/${prdId}/version`, { change_summary: changeSummary });
  }

  static async getPRDVersions(prdId: string): Promise<{ versions: any[] }> {
    return this.get(`/api/prd/${prdId}/versions`);
  }

  static async getRecentPRDs(): Promise<{ prds: any[] }> {
    return this.get('/api/prd/recent');
  }

  static async updatePRDTitle(prdId: string, title: string): Promise<{ prd: any }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/prd/${prdId}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API request failed');
    }
    return response.json();
  }

  static async updatePRDStatus(prdId: string, status: 'draft' | 'published' | 'archived'): Promise<{ prd: any }> {
    const headers = await this.getAuthHeaders();
    
    console.log('Updating PRD status:', { prdId, status });
    
    const response = await fetch(`${API_BASE_URL}/api/prd/${prdId}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status }),
    });

    console.log('Update status response:', response.status, response.ok);

    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await response.json();
        console.error('Update status error data:', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  static async comparePRDs(v1Id: string, v2Id: string): Promise<{ v1: any; v2: any; diff: any }> {
    return this.get(`/api/prd/compare?v1=${v1Id}&v2=${v2Id}`);
  }

  static async deletePRDVersion(prdId: string): Promise<{ success: boolean }> {
    return this.delete(`/api/prd/${prdId}`);
  }

  static async deletePRDGroup(groupId: string): Promise<{ success: boolean }> {
    return this.delete(`/api/prd/group/${groupId}`);
  }

  static async searchSections(query: string, prdVersionId?: string, sectionId?: string, userContext?: any, hybrid = false, signal?: AbortSignal): Promise<{ phase: string; query_hash: string; results: any[]; search_time_ms?: number; bm25_count?: number; vector_count?: number; merged_count?: number; timestamp: string }> {
    // Extract expanded_context from userContext if present
    const { expanded_context, ...restContext } = userContext || {};
    return this.post('/api/search/sections', { 
      query, 
      prd_version_id: prdVersionId, 
      section_id: sectionId, 
      user_context: restContext, 
      expanded_context: expanded_context,
      hybrid 
    }, signal);
  }

  // Document version management
  static async linkDocumentVersions(newerDocId: string, olderDocId: string): Promise<{ success: boolean; message: string; version_group_id: string }> {
    return this.post('/api/documents/link-versions', { newerDocId, olderDocId });
  }

  static async dismissDuplicateDocument(documentId: string, duplicateId: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/documents/dismiss-duplicate', { documentId, duplicateId });
  }

  // Wireframe-based requirements generation
  static async generateRequirementsFromWireframe(
    wireframe: string, 
    context: { objective?: string; background?: string; scope?: string }, 
    retrievedChunks?: any[]
  ): Promise<{ requirements: string; confidence: number; metadata: any }> {
    return this.post('/api/prd/generate-requirements-from-wireframe', { 
      wireframe, 
      context, 
      retrievedChunks: retrievedChunks || [] 
    });
  }

  static async regenerateRequirementsFromWireframe(
    prdId: string,
    wireframe: string, 
    existingPRD: any
  ): Promise<{ requirements: string; confidence: number; metadata: any }> {
    return this.post('/api/prd/regenerate-requirements-from-wireframe', { 
      prdId, 
      wireframe, 
      existingPRD 
    });
  }

  static async savePRDSectionWithWireframe(
    prdVersionId: string, 
    sectionId: string, 
    content: string, 
    wireframeUrl?: string,
    wireframeMetadata?: any,
    metadata?: Record<string, any>, 
    citationChunkIds?: string[]
  ): Promise<{ section: any }> {
    return this.post('/api/prd/sections', { 
      prd_version_id: prdVersionId, 
      section_id: sectionId, 
      content, 
      wireframe_url: wireframeUrl,
      wireframe_metadata: wireframeMetadata,
      metadata, 
      citation_chunk_ids: citationChunkIds 
    });
  }

  // Audio transcription
  static async transcribeAudio(formData: FormData): Promise<{ text: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
      method: 'POST',
      headers: {
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`
        }),
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Transcription failed' }));
      throw new Error(error.message || 'Transcription request failed');
    }

    return response.json();
  }

  // AI section draft generation
  static async generateSectionDraft(sectionId: string, context: any): Promise<{ draft: string; confidence?: number }> {
    return this.post('/api/prd/generate-section-draft', { section_id: sectionId, context });
  }

  // ============================================================================
  // Jira Integration
  // ============================================================================

  // Start Jira OAuth flow
  static async startJiraAuth(): Promise<{ url: string; state: string }> {
    return this.get('/api/jira/auth/start');
  }

  // Get Jira connection status
  static async getJiraConnection(): Promise<{
    connected: boolean;
    reason?: string;
    error?: string;
    siteUrl?: string;
    email?: string;
    displayName?: string;
    defaultProject?: { key: string; name: string } | null;
  }> {
    return this.get('/api/jira/connection');
  }

  // Disconnect Jira
  static async disconnectJira(): Promise<{ success: boolean }> {
    return this.delete('/api/jira/connection');
  }

  // Get available Jira projects
  static async getJiraProjects(): Promise<{
    projects: Array<{
      id: string;
      key: string;
      name: string;
      projectTypeKey: string;
      avatarUrls?: Record<string, string>;
    }>;
    defaultProject: { key: string; name: string } | null;
  }> {
    return this.get('/api/jira/projects');
  }

  // Select default Jira project
  static async selectJiraProject(projectKey: string): Promise<{
    success: boolean;
    project: {
      key: string;
      name: string;
      issueTypes: Array<{
        id: string;
        name: string;
        description?: string;
        subtask: boolean;
        hierarchyLevel?: number;
      }>;
    };
  }> {
    return this.post('/api/jira/projects/select', { projectKey });
  }

  // Get issue types for a project
  static async getJiraProjectIssueTypes(projectKey: string): Promise<{
    issueTypes: Array<{
      id: string;
      name: string;
      description?: string;
      subtask: boolean;
      hierarchyLevel?: number;
    }>;
  }> {
    return this.get(`/api/jira/projects/${projectKey}/types`);
  }

  // Mark PRD as ready for execution
  static async markPRDReady(prdId: string, options?: {
    jiraProjectKey?: string;
    granularityMode?: 'rolled_up' | 'balanced' | 'granular';
  }): Promise<{ success: boolean; prd: any }> {
    return this.post(`/api/prd/${prdId}/mark-ready`, {
      jiraProjectKey: options?.jiraProjectKey,
      granularityMode: options?.granularityMode || 'rolled_up'
    });
  }

  // Classify PRD size
  static async classifyPRD(prdId: string): Promise<{
    classification: 'small' | 'medium' | 'large';
    reasoning: string;
    featureAreas: string[];
    estimatedStoryCount: number;
  }> {
    return this.post(`/api/prd/${prdId}/classify`, {});
  }

  // Generate draft tickets from PRD
  static async generateDraftTickets(prdId: string, options?: {
    granularityMode?: 'rolled_up' | 'balanced' | 'granular';
    classification?: 'small' | 'medium' | 'large';
  }): Promise<{
    success: boolean;
    tickets: Array<{
      id: string;
      issueType: string;
      summary: string;
      description: string;
      acceptanceCriteria: string;
      priority: string;
      featureArea: string;
      parentTicketId?: string;
    }>;
    classification: string;
  }> {
    return this.post(`/api/prd/${prdId}/draft-tickets`, options || {});
  }

  // Get tickets for a PRD
  static async getPRDTickets(prdId: string): Promise<{
    tickets: Array<{
      id: string;
      jira_issue_key?: string;
      issue_type: string;
      draft_summary: string;
      draft_description?: string;
      draft_acceptance_criteria?: string;
      draft_priority: string;
      feature_area?: string;
      status: 'draft' | 'approved' | 'rejected' | 'published';
      jira_status?: string;
      jira_assignee_name?: string;
      parent_ticket_id?: string;
      parent_jira_key?: string;
      sort_order: number;
      depth: number;
    }>;
    progress: {
      total_tickets: number;
      published_tickets: number;
      draft_tickets: number;
      approved_tickets: number;
      rejected_tickets: number;
      jira_todo: number;
      jira_in_progress: number;
      jira_qa: number;
      jira_done: number;
      jira_blocked: number;
      completion_percentage: number;
    } | null;
  }> {
    return this.get(`/api/prd/${prdId}/tickets`);
  }

  // Update a draft ticket
  static async updateDraftTicket(prdId: string, ticketId: string, data: {
    summary?: string;
    description?: string;
    acceptanceCriteria?: string;
    priority?: string;
  }): Promise<{ success: boolean; ticket: any }> {
    return this.patch(`/api/prd/${prdId}/tickets/${ticketId}`, data);
  }

  // Approve a ticket
  static async approveTicket(prdId: string, ticketId: string): Promise<{ success: boolean; ticket: any }> {
    return this.post(`/api/prd/${prdId}/tickets/${ticketId}/approve`, {});
  }

  // Reject a ticket
  static async rejectTicket(prdId: string, ticketId: string): Promise<{ success: boolean; ticket: any }> {
    return this.post(`/api/prd/${prdId}/tickets/${ticketId}/reject`, {});
  }

  // Bulk approve all tickets
  static async approveAllTickets(prdId: string): Promise<{ success: boolean; approvedCount: number }> {
    return this.post(`/api/prd/${prdId}/tickets/approve-all`, {});
  }

  // Publish approved tickets to Jira
  static async publishTicketsToJira(prdId: string): Promise<{
    success: boolean;
    published: Array<{
      ticketId: string;
      jiraKey: string;
      jiraUrl: string;
    }>;
    errors: Array<{
      ticketId: string;
      error: string;
    }>;
  }> {
    return this.post(`/api/prd/${prdId}/tickets/publish`, {});
  }

  // Sync Jira status for PRD tickets
  static async syncJiraStatus(prdId: string): Promise<{
    success: boolean;
    synced: number;
    tickets: any[];
  }> {
    return this.post(`/api/prd/${prdId}/sync-jira`, {});
  }

  // Get drift logs for a PRD
  static async getPRDDriftLogs(prdId: string): Promise<{
    logs: Array<{
      id: string;
      changeType: string;
      changeSummary: string;
      changedSections: string[];
      severity: 'low' | 'medium' | 'high';
      suggestedAction?: string;
      status: 'pending' | 'acknowledged' | 'resolved';
      detectedAt: string;
    }>;
  }> {
    return this.get(`/api/prd/${prdId}/drift`);
  }

  // Acknowledge drift
  static async acknowledgeDrift(prdId: string, logId: string): Promise<{ success: boolean }> {
    return this.post(`/api/prd/${prdId}/drift/${logId}/acknowledge`, {});
  }

  // Resolve drift
  static async resolveDrift(prdId: string, logId: string, resolution: string): Promise<{ success: boolean }> {
    return this.post(`/api/prd/${prdId}/drift/${logId}/resolve`, { resolution });
  }
}
