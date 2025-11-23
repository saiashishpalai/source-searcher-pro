/**
 * Webhook sync utility for n8n integration
 * Sends user data to n8n workflow for HubSpot and WATI integration
 */

import { toast } from 'sonner';

export interface UserSyncData {
  email: string;
  user_id: string;
  sources_connected: number;
  onboarding_stage: string;
  phone_number?: string;
}

/**
 * Simple logging utility
 */
function simpleLog(level: 'log' | 'warn' | 'error', message: string) {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console[level](`${prefix} [n8n] ${message}`);
}

// No debug helpers in production

/**
 * Syncs user data to n8n webhook
 * Non-blocking: errors are logged but don't throw
 * 
 * @param userData - User data to sync
 * @returns Promise that resolves when sync attempt completes (success or failure)
 */
export async function syncToN8n(userData: UserSyncData): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8085';
  const proxyUrl = `${apiUrl}/api/webhook/n8n`;

  if (!apiUrl) {
    console.warn('⚠️ [n8n] VITE_API_URL not configured');
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    simpleLog('log', `User ${userData.email} synced successfully`);
    
    toast.success('Synced to HubSpot', {
      description: `Welcome email queued for ${userData.email}`,
      duration: 5000,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    simpleLog('error', `Failed to sync: ${errorMessage}`);
    
    // Silent fail - don't show toast for webhook errors
    // User signup succeeded, webhook is non-critical
  }
}

