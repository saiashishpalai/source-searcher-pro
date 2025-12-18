/**
 * JiraSyncService - Polls Jira for status updates on published tickets
 * 
 * Handles:
 * - Periodic sync of ticket statuses
 * - Status mapping from Jira to Haven7 categories
 * - Assignee and sprint updates
 */

import { JiraApiService } from './jira-api.js';
import { JiraAuthService } from './jira-auth.js';

export class JiraSyncService {
  constructor(supabaseAdmin, jiraAuthService = null) {
    this.supabaseAdmin = supabaseAdmin;
    this.jiraAuthService = jiraAuthService || new JiraAuthService(supabaseAdmin);
    this.syncIntervalMs = parseInt(process.env.JIRA_SYNC_INTERVAL_MS) || 30 * 60 * 1000; // 30 minutes default
    this.isRunning = false;
  }

  /**
   * Start the periodic sync job
   */
  startPeriodicSync() {
    if (this.isRunning) {
      console.log('Jira sync already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting Jira sync service (interval: ${this.syncIntervalMs / 1000}s)`);
    
    // Run immediately
    this.syncAllActiveTickets().catch(console.error);
    
    // Then run periodically
    this.syncInterval = setInterval(() => {
      this.syncAllActiveTickets().catch(console.error);
    }, this.syncIntervalMs);
  }

  /**
   * Stop the periodic sync job
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Jira sync service stopped');
  }

  /**
   * Sync all active tickets across all users
   */
  async syncAllActiveTickets() {
    console.log(`[JiraSync] Starting sync at ${new Date().toISOString()}`);
    
    try {
      // Get all published tickets with Jira keys, grouped by user
      const { data: tickets, error } = await this.supabaseAdmin
        .from('prd_jira_tickets')
        .select(`
          id,
          jira_issue_key,
          jira_issue_id,
          prd_version_id,
          prd_versions!inner(user_id)
        `)
        .eq('status', 'published')
        .not('jira_issue_key', 'is', null);

      if (error) {
        console.error('[JiraSync] Failed to fetch tickets:', error);
        return;
      }

      if (!tickets || tickets.length === 0) {
        console.log('[JiraSync] No published tickets to sync');
        return;
      }

      // Group tickets by user
      const ticketsByUser = new Map();
      for (const ticket of tickets) {
        const userId = ticket.prd_versions?.user_id;
        if (!userId) continue;
        
        if (!ticketsByUser.has(userId)) {
          ticketsByUser.set(userId, []);
        }
        ticketsByUser.get(userId).push(ticket);
      }

      console.log(`[JiraSync] Syncing ${tickets.length} tickets for ${ticketsByUser.size} users`);

      // Process each user's tickets
      for (const [userId, userTickets] of ticketsByUser) {
        await this.syncUserTickets(userId, userTickets);
      }

      console.log(`[JiraSync] Sync completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[JiraSync] Sync failed:', error);
    }
  }

  /**
   * Refresh token if expired
   */
  async refreshTokenIfNeeded(connection) {
    const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : new Date(0);
    const now = new Date();
    
    
    // Refresh if token expires in less than 5 minutes
    if (tokenExpiry <= new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log(`[JiraSync] Token expired or expiring soon, attempting refresh...`);
      
      if (!connection.refresh_token) {
        console.log(`[JiraSync] No refresh token available`);
        return null;
      }
      
      try {
        const newTokens = await this.jiraAuthService.refreshAccessToken(connection.refresh_token);
        
        // Update the database with new tokens
        const { error: updateError } = await this.supabaseAdmin
          .from('jira_connections')
          .update({
            access_token: newTokens.accessToken,
            refresh_token: newTokens.refreshToken,
            token_expires_at: new Date(Date.now() + newTokens.expiresIn * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', connection.user_id);
        
        if (updateError) {
          console.error('[JiraSync] Failed to update tokens:', updateError);
          return null;
        }
        
        console.log(`[JiraSync] Token refreshed successfully`);
        return newTokens.accessToken;
      } catch (error) {
        console.error('[JiraSync] Token refresh failed:', error.message);
        return null;
      }
    }
    
    return connection.access_token;
  }

  /**
   * Sync tickets for a specific user
   */
  async syncUserTickets(userId, tickets) {
    try {
      // Get user's Jira connection
      const { data: connection, error: connError } = await this.supabaseAdmin
        .from('jira_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (connError || !connection) {
        console.log(`[JiraSync] No Jira connection for user ${userId}`);
        return;
      }

      // Refresh token if needed
      const accessToken = await this.refreshTokenIfNeeded(connection);
      if (!accessToken) {
        console.log(`[JiraSync] Unable to get valid token for user ${userId}`);
        return;
      }

      const jiraApi = new JiraApiService(
        accessToken,
        connection.cloud_id,
        connection.site_url
      );

      // Build JQL to fetch all issues at once
      const issueKeys = tickets.map(t => t.jira_issue_key).filter(Boolean);
      if (issueKeys.length === 0) return;

      const jql = `key in (${issueKeys.map(k => `"${k}"`).join(',')})`;
      
      try {
        const searchResult = await jiraApi.searchIssues(jql, {
          maxResults: Math.min(issueKeys.length, 100),
          fields: ['summary', 'status', 'assignee', 'priority', 'updated']
        });
        
        const issues = searchResult?.issues || [];
        
        if (issues.length === 0) {
          console.log(`[JiraSync] No issues found for user ${userId}`);
          return;
        }

        // Create a map of Jira data by key
        const jiraDataMap = new Map(
          issues.map(issue => [issue.key, issue])
        );

        // Update each ticket
        let updatedCount = 0;
        for (const ticket of tickets) {
          const jiraData = jiraDataMap.get(ticket.jira_issue_key);
          if (!jiraData) continue;

          await this.updateTicketStatus(ticket.id, jiraData);
          updatedCount++;
        }

        console.log(`[JiraSync] Updated ${updatedCount} tickets for user ${userId}`);
      } catch (apiError) {
        console.error(`[JiraSync] API error for user ${userId}:`, apiError.message);
      }
    } catch (error) {
      console.error(`[JiraSync] Error syncing user ${userId}:`, error);
    }
  }

  /**
   * Sync tickets for a specific PRD
   */
  async syncPRDTickets(prdVersionId, userId) {
    try {
      // Get Jira connection
      const { data: connection, error: connError } = await this.supabaseAdmin
        .from('jira_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (connError || !connection) {
        throw new Error('Jira not connected');
      }

      // Refresh token if needed
      const accessToken = await this.refreshTokenIfNeeded(connection);
      if (!accessToken) {
        throw new Error('Unable to get valid Jira token. Please reconnect Jira.');
      }

      // Get published tickets for this PRD
      const { data: tickets, error: ticketsError } = await this.supabaseAdmin
        .from('prd_jira_tickets')
        .select('id, jira_issue_key')
        .eq('prd_version_id', prdVersionId)
        .eq('status', 'published')
        .not('jira_issue_key', 'is', null);

      if (ticketsError || !tickets || tickets.length === 0) {
        return { synced: 0, tickets: [] };
      }

      const jiraApi = new JiraApiService(
        accessToken,
        connection.cloud_id,
        connection.site_url
      );

      const issueKeys = tickets.map(t => t.jira_issue_key);
      const jql = `key in (${issueKeys.map(k => `"${k}"`).join(',')})`;
      
      const { issues } = await jiraApi.searchIssues(jql, {
        maxResults: issueKeys.length,
        fields: ['summary', 'status', 'assignee', 'priority', 'updated']
      });

      const jiraDataMap = new Map(
        issues.map(issue => [issue.key, issue])
      );

      const updatedTickets = [];
      for (const ticket of tickets) {
        const jiraData = jiraDataMap.get(ticket.jira_issue_key);
        if (!jiraData) continue;

        const updated = await this.updateTicketStatus(ticket.id, jiraData);
        if (updated) {
          updatedTickets.push({
            id: ticket.id,
            jiraKey: ticket.jira_issue_key,
            status: jiraData.status,
            assignee: jiraData.assignee?.name
          });
        }
      }

      return { synced: updatedTickets.length, tickets: updatedTickets };
    } catch (error) {
      console.error(`[JiraSync] Error syncing PRD ${prdVersionId}:`, error);
      throw error;
    }
  }

  /**
   * Update a single ticket's status from Jira data
   */
  async updateTicketStatus(ticketId, jiraData) {
    try {
      const statusCategory = this.mapStatusCategory(jiraData.status, jiraData.statusCategory);
      
      const { error } = await this.supabaseAdmin
        .from('prd_jira_tickets')
        .update({
          jira_status: jiraData.status,
          jira_status_category: statusCategory,
          jira_assignee_id: jiraData.assignee?.id,
          jira_assignee_name: jiraData.assignee?.name,
          jira_priority: jiraData.priority,
          jira_updated_at: jiraData.updated,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) {
        console.error(`[JiraSync] Failed to update ticket ${ticketId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[JiraSync] Error updating ticket ${ticketId}:`, error);
      return false;
    }
  }

  /**
   * Map Jira status to Haven7 status category
   */
  mapStatusCategory(status, category) {
    const statusLower = status?.toLowerCase() || '';
    
    // Check for specific statuses first
    if (statusLower.includes('blocked')) {
      return 'blocked';
    }
    
    if (statusLower.includes('qa') || statusLower.includes('review') || statusLower.includes('testing')) {
      return 'qa';
    }
    
    if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('resolved')) {
      return 'done';
    }
    
    if (statusLower.includes('progress') || statusLower.includes('dev') || statusLower.includes('coding')) {
      return 'in_progress';
    }
    
    // Fall back to Jira's category
    switch (category) {
      case 'done':
        return 'done';
      case 'indeterminate':
        return 'in_progress';
      case 'new':
      default:
        return 'todo';
    }
  }
}

