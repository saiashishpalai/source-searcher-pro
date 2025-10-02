import { SupabaseClient } from '@supabase/supabase-js';

export async function getUserConnections(supabase: SupabaseClient, userId: string) {
  console.log('🔍 Getting user connections for:', userId);
  
  try {
    // Add 5-second timeout to prevent hanging
    const { data, error } = await Promise.race([
      supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 5 seconds')), 5000)
      )
    ]);
      
    if (error) {
      console.error('❌ Error getting connections:', error);
      throw error;
    }
    
    console.log('✅ Found connections:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ getUserConnections timeout or error:', error);
    return [];
  }
}

export async function hasConnection(supabase: SupabaseClient, userId: string, sourceType: string) {
  try {
    const connections = await getUserConnections(supabase, userId);
    return connections.some(conn => conn.source_type === sourceType);
  } catch (error) {
    console.error('❌ hasConnection error:', error);
    return false;
  }
}

export async function disconnectSource(supabase: SupabaseClient, userId: string, sourceType: string) {
  console.log('🔌 Disconnecting source:', sourceType, 'for user:', userId);
  
  try {
    // Add 5-second timeout to prevent hanging
    const { data, error } = await Promise.race([
      supabase
        .from('user_connections')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('source_type', sourceType)
        .eq('is_active', true),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 5 seconds')), 5000)
      )
    ]);
      
    if (error) {
      console.error('❌ Error disconnecting source:', error);
      throw error;
    }
    
    console.log('✅ Disconnected source successfully');
    return data;
  } catch (error) {
    console.error('❌ disconnectSource timeout or error:', error);
    throw error;
  }
}

export async function getConnectionDetails(supabase: SupabaseClient, userId: string, sourceType: string) {
  try {
    // Add 5-second timeout to prevent hanging
    const { data, error } = await Promise.race([
      supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('source_type', sourceType)
        .eq('is_active', true)
        .single(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 5 seconds')), 5000)
      )
    ]);
      
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error getting connection details:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ getConnectionDetails timeout or error:', error);
    return null;
  }
}

export async function updateLastSynced(supabase: SupabaseClient, connectionId: string) {
  try {
    // Add 5-second timeout to prevent hanging
    const { error } = await Promise.race([
      supabase
        .from('user_connections')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', connectionId),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 5 seconds')), 5000)
      )
    ]);
      
    if (error) {
      console.error('❌ Error updating last synced:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ updateLastSynced timeout or error:', error);
    throw error;
  }
}