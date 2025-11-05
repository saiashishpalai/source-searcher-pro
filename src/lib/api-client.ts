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

  // PRD management
  static async createPRD(title: string): Promise<{ prd: any }> {
    return this.post('/api/prd/create', { title });
  }

  static async savePRDSection(prdVersionId: string, sectionId: string, content: string, metadata?: Record<string, any>): Promise<{ section: any }> {
    return this.post('/api/prd/sections', { prd_version_id: prdVersionId, section_id: sectionId, content, metadata });
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
    return this.post('/api/search/sections', { query, prd_version_id: prdVersionId, section_id: sectionId, user_context: userContext, hybrid }, signal);
  }

  // Document version management
  static async linkDocumentVersions(newerDocId: string, olderDocId: string): Promise<{ success: boolean; message: string; version_group_id: string }> {
    return this.post('/api/documents/link-versions', { newerDocId, olderDocId });
  }

  static async dismissDuplicateDocument(documentId: string, duplicateId: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/documents/dismiss-duplicate', { documentId, duplicateId });
  }
}
