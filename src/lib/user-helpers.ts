import { SupabaseClient } from '@supabase/supabase-js';
import { getUserConnections } from './connections/get-connections';

/**
 * Gets the count of connected sources for a user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @returns Promise resolving to count of active connections
 */
export async function getSourcesConnectedCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const connections = await getUserConnections(supabase, userId);
    return connections.length;
  } catch (error) {
    console.error('❌ Error getting sources connected count:', error);
    return 0;
  }
}

/**
 * Determines onboarding stage based on number of connected sources
 * 
 * @param sourcesConnected - Number of connected sources
 * @returns Onboarding stage string
 */
export function getOnboardingStage(sourcesConnected: number): string {
  if (sourcesConnected === 0) {
    return 'New User';
  } else if (sourcesConnected >= 3) {
    return 'Active User';
  } else {
    return 'Onboarding';
  }
}

