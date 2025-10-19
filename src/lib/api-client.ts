import { supabase } from '@/integrations/supabase/client';
import { getEnvVar } from './env';

// Use relative URL in development to go through Vite proxy
// In production, use the full API URL
const API_BASE_URL = import.meta.env.DEV ? '' : (getEnvVar('VITE_API_URL') || 'https://localhost:3000');

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

  static async post<T = any>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
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

  // Document version management
  static async linkDocumentVersions(newerDocId: string, olderDocId: string): Promise<{ success: boolean; message: string; version_group_id: string }> {
    return this.post('/api/documents/link-versions', { newerDocId, olderDocId });
  }

  static async dismissDuplicateDocument(documentId: string, duplicateId: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/documents/dismiss-duplicate', { documentId, duplicateId });
  }
}
