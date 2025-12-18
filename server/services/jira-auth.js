/**
 * JiraAuthService - Handles Atlassian OAuth 2.0 (3LO) for Jira Cloud
 * 
 * Implements the full OAuth flow for connecting Haven7 to Jira Cloud:
 * 1. Generate authorization URL
 * 2. Exchange code for tokens
 * 3. Refresh expired tokens
 * 4. Manage connection lifecycle
 */

import crypto from 'crypto';

export class JiraAuthService {
  constructor(supabaseAdmin) {
    this.supabaseAdmin = supabaseAdmin;
    
    // OAuth configuration
    this.clientId = process.env.JIRA_CLIENT_ID;
    this.clientSecret = process.env.JIRA_CLIENT_SECRET;
    this.redirectUri = process.env.JIRA_REDIRECT_URI || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/jira/auth/callback`;
    
    // Debug logging
    console.log('[JiraAuth] Initializing with:', {
      hasClientId: !!this.clientId,
      clientIdLength: this.clientId?.length || 0,
      clientIdPreview: this.clientId ? `${this.clientId.substring(0, 10)}...` : 'MISSING',
      hasClientSecret: !!this.clientSecret,
      redirectUri: this.redirectUri
    });
    
    if (!this.clientId) {
      console.error('[JiraAuth] ERROR: JIRA_CLIENT_ID is not set in environment variables!');
    }
    if (!this.clientSecret) {
      console.error('[JiraAuth] ERROR: JIRA_CLIENT_SECRET is not set in environment variables!');
    }
    
    // Atlassian OAuth endpoints
    this.authBaseUrl = 'https://auth.atlassian.com';
    this.apiBaseUrl = 'https://api.atlassian.com';
    
    // Required scopes for Jira integration
    this.scopes = [
      'read:jira-work',
      'write:jira-work',
      'read:jira-user',
      'offline_access'  // Required for refresh tokens
    ];
  }

  /**
   * Generate OAuth authorization URL for user to authenticate
   * @param {string} userId - Haven7 user ID for state validation
   * @returns {Object} Authorization URL and state token
   */
  getAuthorizationUrl(userId) {
    if (!this.clientId) {
      throw new Error('JIRA_CLIENT_ID is not configured. Please set JIRA_CLIENT_ID in your environment variables.');
    }
    
    // Generate secure state token
    const state = crypto.randomBytes(32).toString('hex');
    const stateData = {
      userId,
      nonce: state,
      timestamp: Date.now()
    };
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');
    
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.clientId,
      scope: this.scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: encodedState,
      response_type: 'code',
      prompt: 'consent'
    });
    
    const authUrl = `${this.authBaseUrl}/authorize?${params.toString()}`;
    
    // Debug logging
    console.log('[JiraAuth] Generated auth URL:', {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      urlPreview: authUrl.substring(0, 100) + '...'
    });
    
    return {
      url: authUrl,
      state: encodedState
    };
  }

  /**
   * Validate state token from OAuth callback
   * @param {string} encodedState - Base64url encoded state
   * @returns {Object|null} Decoded state data or null if invalid
   */
  validateState(encodedState) {
    try {
      const stateData = JSON.parse(Buffer.from(encodedState, 'base64url').toString());
      
      // Check if state is not too old (15 minutes max)
      const maxAge = 15 * 60 * 1000;
      if (Date.now() - stateData.timestamp > maxAge) {
        console.error('OAuth state expired');
        return null;
      }
      
      return stateData;
    } catch (error) {
      console.error('Failed to validate OAuth state:', error);
      return null;
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param {string} code - Authorization code from Atlassian
   * @returns {Object} Token data
   */
  async exchangeCodeForTokens(code) {
    const tokenUrl = `${this.authBaseUrl}/oauth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Token exchange failed:', error);
      throw new Error(error.error_description || 'Failed to exchange code for tokens');
    }
    
    const tokens = await response.json();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope
    };
  }

  /**
   * Refresh an expired access token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Object} New token data
   */
  async refreshAccessToken(refreshToken) {
    const tokenUrl = `${this.authBaseUrl}/oauth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Token refresh failed:', error);
      throw new Error(error.error_description || 'Failed to refresh token');
    }
    
    const tokens = await response.json();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope
    };
  }

  /**
   * Get accessible Atlassian cloud resources (sites)
   * @param {string} accessToken - Valid access token
   * @returns {Array} List of accessible cloud resources
   */
  async getAccessibleResources(accessToken) {
    const response = await fetch(`${this.apiBaseUrl}/oauth/token/accessible-resources`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get accessible resources');
    }
    
    return response.json();
  }

  /**
   * Get current user's Jira profile
   * @param {string} accessToken - Valid access token
   * @param {string} cloudId - Atlassian cloud instance ID
   * @returns {Object} User profile data
   */
  async getJiraUserProfile(accessToken, cloudId) {
    const response = await fetch(`${this.apiBaseUrl}/ex/jira/${cloudId}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get user profile');
    }
    
    return response.json();
  }

  /**
   * Save Jira connection to database
   * @param {string} userId - Haven7 user ID
   * @param {Object} connectionData - Connection details
   */
  async saveConnection(userId, connectionData) {
    const {
      accessToken,
      refreshToken,
      expiresIn,
      cloudId,
      siteUrl,
      jiraAccountId,
      jiraEmail,
      jiraDisplayName,
      scopes
    } = connectionData;
    
    const tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    const { data, error } = await this.supabaseAdmin
      .from('jira_connections')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        cloud_id: cloudId,
        site_url: siteUrl,
        jira_account_id: jiraAccountId,
        jira_email: jiraEmail,
        jira_display_name: jiraDisplayName,
        scopes_granted: scopes ? scopes.split(' ') : this.scopes,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to save Jira connection:', error);
      throw new Error('Failed to save connection');
    }
    
    return data;
  }

  /**
   * Get user's Jira connection
   * @param {string} userId - Haven7 user ID
   * @returns {Object|null} Connection data or null
   */
  async getConnection(userId) {
    const { data, error } = await this.supabaseAdmin
      .from('jira_connections')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Failed to get Jira connection:', error);
      throw new Error('Failed to get connection');
    }
    
    return data;
  }

  /**
   * Get valid access token (refreshes if expired)
   * @param {string} userId - Haven7 user ID
   * @returns {Object} Connection with valid token
   */
  async getValidConnection(userId) {
    const connection = await this.getConnection(userId);
    
    if (!connection) {
      return null;
    }
    
    // Check if token is expired or will expire in next 5 minutes
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (tokenExpiry <= fiveMinutesFromNow) {
      // Token is expired or will expire soon, refresh it
      if (!connection.refresh_token) {
        throw new Error('Token expired and no refresh token available. Please reconnect Jira.');
      }
      
      try {
        const newTokens = await this.refreshAccessToken(connection.refresh_token);
        
        // Update stored tokens
        const newExpiresAt = new Date(Date.now() + (newTokens.expiresIn * 1000)).toISOString();
        
        const { data: updatedConnection, error } = await this.supabaseAdmin
          .from('jira_connections')
          .update({
            access_token: newTokens.accessToken,
            refresh_token: newTokens.refreshToken,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) {
          throw new Error('Failed to update refreshed tokens');
        }
        
        return updatedConnection;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Failed to refresh Jira token. Please reconnect.');
      }
    }
    
    return connection;
  }

  /**
   * Delete user's Jira connection
   * @param {string} userId - Haven7 user ID
   */
  async deleteConnection(userId) {
    const { error } = await this.supabaseAdmin
      .from('jira_connections')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to delete Jira connection:', error);
      throw new Error('Failed to delete connection');
    }
    
    return { success: true };
  }

  /**
   * Update default project for user
   * @param {string} userId - Haven7 user ID
   * @param {Object} projectData - Project details
   */
  async updateDefaultProject(userId, projectData) {
    const { projectKey, projectId, projectName, issueTypes } = projectData;
    
    const { data, error } = await this.supabaseAdmin
      .from('jira_connections')
      .update({
        default_project_key: projectKey,
        default_project_id: projectId,
        default_project_name: projectName,
        available_issue_types: issueTypes || [],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update default project:', error);
      throw new Error('Failed to update default project');
    }
    
    return data;
  }

  /**
   * Verify Jira connection is still valid
   * @param {string} userId - Haven7 user ID
   * @returns {Object} Connection status
   */
  async verifyConnection(userId) {
    try {
      const connection = await this.getValidConnection(userId);
      
      if (!connection) {
        return { connected: false, reason: 'no_connection' };
      }
      
      // Test the connection by fetching user profile
      const profile = await this.getJiraUserProfile(connection.access_token, connection.cloud_id);
      
      return {
        connected: true,
        siteUrl: connection.site_url,
        email: profile.emailAddress,
        displayName: profile.displayName,
        defaultProject: connection.default_project_key ? {
          key: connection.default_project_key,
          name: connection.default_project_name
        } : null
      };
    } catch (error) {
      console.error('Connection verification failed:', error);
      return { 
        connected: false, 
        reason: 'verification_failed',
        error: error.message 
      };
    }
  }
}

