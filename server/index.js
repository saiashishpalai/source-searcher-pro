import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { DocumentSync } from './services/document-sync.js';
import { SearchService } from './services/search-service.js';
import { NotionSync } from './services/notion-sync.js';
import { SlackSync } from './services/slack-sync.js';

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://localhost:8080';
const API_BASE_URL = process.env.API_BASE_URL || `https://localhost:${PORT}`;


app.use(cors({ 
  origin: ['https://localhost:8080', 'http://localhost:8080', 'http://localhost:8083'],
  credentials: true 
}));
app.use(express.json());

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Initialize services
const documentSync = new DocumentSync(process.env.OPENAI_API_KEY);
const searchService = new SearchService(process.env.OPENAI_API_KEY);
const notionSync = new NotionSync(process.env.OPENAI_API_KEY, supabaseAdmin);
const slackSync = new SlackSync(process.env.OPENAI_API_KEY, supabaseAdmin);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint to check Notion connection
app.get('/api/test/notion-connection', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const { data: connection, error } = await supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'notion')
      .single();
    
    if (error || !connection) {
      return res.json({ 
        hasConnection: false, 
        error: error?.message || 'No connection found' 
      });
    }
    
    res.json({ 
      hasConnection: true, 
      connection: {
        id: connection.id,
        source_type: connection.source_type,
        is_active: connection.is_active,
        hasAccessToken: !!connection.access_token,
        created_at: connection.created_at
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET USER CONNECTIONS
app.get('/api/connections/get', async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Verify the JWT token with Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch user connections
    const { data: connections, error: dbError } = await supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to fetch connections' });
    }

    return res.json({ connections: connections || [] });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GOOGLE OAUTH CALLBACK - COMPLETE IMPLEMENTATION
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    
    if (Date.now() - stateData.timestamp > 600000) {
      return res.redirect(`${APP_URL}/connect-sources?error=expired`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${API_BASE_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange failed:', error);
      return res.redirect(`${APP_URL}/connect-sources?error=token_failed`);
    }

    const tokens = await tokenResponse.json();
    
    // Fetch Google user info to get source_user_id
    let googleUserId = 'google_user';
    let userEmail = '';
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        googleUserId = userInfo.id || 'google_user';
        userEmail = userInfo.email || '';
        console.log('✓ Google user info retrieved:', { id: googleUserId, email: userEmail });
      }
    } catch (error) {
      console.error('Error fetching Google user info:', error.message);
    }

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId,
        source_type: 'google_drive',
        source_user_id: googleUserId, // Required by schema
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        is_active: true,
        metadata: {
          email: userEmail,
          scope: tokens.scope,
        },
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,source_type' 
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.redirect(`${APP_URL}/connect-sources?error=db_failed`);
    }
    
    console.log('✓ Google Drive connection saved to database');

    return res.redirect(`${APP_URL}/connect-sources?connected=google`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${APP_URL}/connect-sources?error=failed`);
  }
});

// SLACK OAUTH CALLBACK
app.get('/api/auth/slack/callback', async (req, res) => {
  console.log('🎯 SLACK CALLBACK RECEIVED!', req.query);
  
  const { code, state } = req.query;
  
  if (!code || !state) {
    console.error('❌ Missing code or state in callback');
    return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    
    if (Date.now() - stateData.timestamp > 600000) {
      return res.redirect(`${APP_URL}/connect-sources?error=expired`);
    }

    console.log('🔄 Attempting Slack token exchange...');
    console.log('   Code:', code.substring(0, 20) + '...');
    console.log('   Client ID:', process.env.SLACK_CLIENT_ID);
    console.log('   Redirect URI:', `${API_BASE_URL}/api/auth/slack/callback`);
    
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: `${API_BASE_URL}/api/auth/slack/callback`,
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('📥 Slack API response:', JSON.stringify(tokens, null, 2));

    if (!tokens.ok) {
      console.error('❌ Slack token exchange failed!');
      console.error('   Full error response:', JSON.stringify(tokens, null, 2));
      return res.redirect(`${APP_URL}/connect-sources?error=token_failed`);
    }
    
    // Extract Slack team and user info
    const slackUserId = tokens.authed_user?.id || tokens.user_id || 'slack_user';
    const teamId = tokens.team?.id || 'unknown';
    const teamName = tokens.team?.name || 'Slack Workspace';
    
    console.log('✓ Slack tokens received:', { 
      teamId, 
      teamName, 
      userId: slackUserId,
      hasAccessToken: !!tokens.access_token 
    });

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId,
        source_type: 'slack',
        source_user_id: slackUserId, // Required by schema
        access_token: tokens.access_token || process.env.SLACK_BOT_TOKEN, // Use bot token if no user token
        refresh_token: tokens.refresh_token || null,
        token_expires_at: null, // Slack tokens don't expire
        is_active: true,
        metadata: {
          team_id: teamId,
          team_name: teamName,
          scope: tokens.scope,
          authed_user: tokens.authed_user,
          bot_token: process.env.SLACK_BOT_TOKEN, // Store bot token separately
        },
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,source_type' 
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.redirect(`${APP_URL}/connect-sources?error=db_failed`);
    }
    
    console.log('✓ Slack connection saved to database');

    return res.redirect(`${APP_URL}/connect-sources?connected=slack`);
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    return res.redirect(`${APP_URL}/connect-sources?error=failed`);
  }
});

// NOTION OAUTH CALLBACK
app.get('/api/auth/notion/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    
    if (Date.now() - stateData.timestamp > 600000) {
      return res.redirect(`${APP_URL}/connect-sources?error=expired`);
    }

    // Notion uses Basic Auth with base64 encoded client_id:client_secret
    const auth = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${API_BASE_URL}/api/auth/notion/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Notion token exchange failed:', error);
      return res.redirect(`${APP_URL}/connect-sources?error=token_failed`);
    }

    const tokens = await tokenResponse.json();
    
    // Extract workspace and user info from Notion response
    const workspaceId = tokens.workspace_id || 'unknown';
    const workspaceName = tokens.workspace_name || 'Notion Workspace';
    const botId = tokens.bot_id || null;
    const ownerId = tokens.owner?.user?.id || tokens.owner?.workspace || 'notion_user';
    
    console.log('✓ Notion tokens received:', { 
      workspaceId, 
      workspaceName, 
      botId,
      hasAccessToken: !!tokens.access_token 
    });

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId,
        source_type: 'notion',
        source_user_id: ownerId, // Required by schema
        access_token: tokens.access_token,
        refresh_token: null, // Notion doesn't provide refresh tokens
        token_expires_at: null, // Notion tokens don't expire
        is_active: true,
        metadata: {
          workspace_id: workspaceId,
          workspace_name: workspaceName,
          bot_id: botId,
          owner: tokens.owner,
        },
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,source_type' 
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.redirect(`${APP_URL}/connect-sources?error=db_failed`);
    }
    
    console.log('✓ Notion connection saved to database');

    return res.redirect(`${APP_URL}/connect-sources?connected=notion`);
  } catch (error) {
    console.error('Notion OAuth callback error:', error);
    return res.redirect(`${APP_URL}/connect-sources?error=failed`);
  }
});

// SYNC DOCUMENTS ENDPOINT
app.post('/api/sync/google-drive', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get Google Drive connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('source_type', 'google_drive')
      .single();
    
    if (connError || !connection) {
      return res.status(400).json({ 
        error: 'Google Drive not connected',
        code: 'NOT_CONNECTED'
      });
    }
    
    console.log('✓ Starting Google Drive sync...');
    
    // Validate OAuth token first
    const testResponse = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=user',
      { headers: { Authorization: `Bearer ${connection.access_token}` } }
    );
    
    if (!testResponse.ok) {
      console.error('✗ OAuth token invalid');
      return res.status(401).json({ 
        error: 'Google OAuth token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Call sync service with real-time logging
    const docs = await documentSync.syncGoogleDrive(
      user.id, 
      connection.access_token, 
      supabaseAdmin
    );
    
    console.log(`✓ Sync complete: ${docs.length} documents`);
    
    res.json({ 
      synced: docs.length,
      total: docs.length,
      message: `Successfully synced ${docs.length} documents`
    });
    
  } catch (error) {
    console.error('✗ Sync error:', error.message);
    
    if (error.message.includes('invalid authentication')) {
      return res.status(401).json({ 
        error: 'OAuth token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      code: 'SYNC_FAILED'
    });
  }
});

// SYNC NOTION ENDPOINT
app.post('/api/sync/notion', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get Notion connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('source_type', 'notion')
      .single();
    
    if (connError || !connection) {
      return res.status(400).json({ 
        error: 'Notion not connected',
        code: 'NOT_CONNECTED'
      });
    }
    
    console.log('✓ Starting Notion sync for user:', user.id);
    
    // Call sync service
    const result = await notionSync.syncNotion(user.id, connection.access_token);
    
    console.log(`✓ Notion sync complete: ${result.synced} documents`);
    
    res.json(result);
    
  } catch (error) {
    console.error('✗ Notion sync error:', error.message);
    
    if (error.code === 'notion_api_error' || error.message.includes('Notion')) {
      return res.status(401).json({ 
        error: 'Notion API error. Token may have expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      code: 'SYNC_FAILED'
    });
  }
});

// SYNC SLACK ENDPOINT
app.post('/api/sync/slack', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get Slack connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('source_type', 'slack')
      .single();
    
    if (connError || !connection) {
      return res.status(400).json({ 
        error: 'Slack not connected',
        code: 'NOT_CONNECTED'
      });
    }
    
    console.log('✓ Starting Slack sync for user:', user.id);
    
    // Call sync service
    const result = await slackSync.syncSlack(user.id, connection.access_token);
    
    console.log(`✓ Slack sync complete: ${result.synced} conversations`);
    
    res.json(result);
    
  } catch (error) {
    console.error('✗ Slack sync error:', error.message);
    
    if (error.code === 'slack_api_error' || error.message.includes('Slack')) {
      return res.status(401).json({ 
        error: 'Slack API error. Token may have expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      code: 'SYNC_FAILED'
    });
  }
});

// SYNC STATUS ENDPOINT
app.get('/api/sync/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get stats for all sources
    const sources = ['google_drive', 'notion', 'slack'];
    const statsBySource = {};

    for (const sourceType of sources) {
      const { data: documents, error: docError } = await supabaseAdmin
        .from('documents')
        .select('id, synced_at, created_at')
        .eq('user_id', user.id)
        .eq('source_type', sourceType)
        .order('synced_at', { ascending: false });

      if (!docError && documents) {
        const totalDocuments = documents.length;
        const lastSyncTime = documents[0]?.synced_at || null;

        // Get chunk count for this source
        const { data: chunks } = await supabaseAdmin
          .from('document_chunks')
          .select('id')
          .eq('user_id', user.id)
          .in('document_id', documents.map(d => d.id));

        statsBySource[sourceType] = {
          totalDocuments,
          totalChunks: chunks?.length || 0,
          lastSyncTime,
          isSyncing: false
        };
      } else {
        statsBySource[sourceType] = {
          totalDocuments: 0,
          totalChunks: 0,
          lastSyncTime: null,
          isSyncing: false
        };
      }
    }

    res.json(statsBySource);

  } catch (error) {
    console.error('Sync status endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CLEAR DATA ENDPOINT (for testing)
app.post('/api/clear-data', async (req, res) => {
  try {
    const { sourceType } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!sourceType) {
      return res.status(400).json({ error: 'sourceType is required' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get documents for this source
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_type', sourceType);
    
    if (documents && documents.length > 0) {
      const docIds = documents.map(d => d.id);
      
      // Delete chunks for these documents
      await supabaseAdmin
        .from('document_chunks')
        .delete()
        .in('document_id', docIds);
      
      // Delete documents for this source
      await supabaseAdmin
        .from('documents')
        .delete()
        .eq('user_id', user.id)
        .eq('source_type', sourceType);
    }
    
    console.log(`✓ Cleared ${sourceType} data for user ${user.id} (${documents?.length || 0} documents)`);
    res.json({ 
      success: true, 
      message: `${sourceType} data cleared`,
      documentsDeleted: documents?.length || 0
    });
    
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DISCONNECT ENDPOINT
app.post('/api/connections/disconnect', async (req, res) => {
  try {
    const { sourceType } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Delete connection
    const { error: deleteError } = await supabaseAdmin
      .from('user_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('source_type', sourceType);
    
    if (deleteError) {
      console.error('Delete connection error:', deleteError);
      return res.status(500).json({ error: 'Failed to disconnect' });
    }
    
    // Get documents for this source first
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_type', sourceType);
    
    // Delete chunks for these documents
    if (documents && documents.length > 0) {
      const docIds = documents.map(d => d.id);
      await supabaseAdmin
        .from('document_chunks')
        .delete()
        .in('document_id', docIds);
      
      console.log(`✓ Deleted ${documents.length} documents and their chunks for ${sourceType}`);
    }
    
    // Delete synced documents
    await supabaseAdmin
      .from('documents')
      .delete()
      .eq('user_id', user.id)
      .eq('source_type', sourceType);
    
    console.log(`✓ Disconnected ${sourceType} for user ${user.id}`);
    res.json({ success: true, documentsDeleted: documents?.length || 0 });
    
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// SEARCH ENDPOINT
app.post('/api/search', async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Perform search
    const results = await searchService.search(user.id, query, supabaseAdmin);

    // Log search
    await supabaseAdmin.from('search_history').insert({
      user_id: user.id,
      query,
      results_count: results.totalResults,
      search_time_ms: results.searchTime,
      filters,
    });

    res.json(results);

  } catch (error) {
    console.error('Search endpoint error:', error);
    
    // Handle specific error types
    if (error.message.includes('OpenAI quota exceeded')) {
      return res.status(429).json({ 
        error: 'Search temporarily unavailable due to API quota limits. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }
    
    res.status(500).json({ 
      error: 'Search failed: Internal Server Error',
      code: 'SEARCH_ERROR'
    });
  }
});

// REGENERATE SUMMARY ENDPOINT
app.post('/api/regenerate-summary', async (req, res) => {
  try {
    const { query, results } = req.body;
    
    if (!query || !results) {
      return res.status(400).json({ error: 'Query and results are required' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log(`✨ Regenerating summary for query: "${query}"`);

    // Generate new AI summary with different temperature for variation
    const aiSummary = await searchService.regenerateSummary(query, results);

    res.json({ aiSummary });

  } catch (error) {
    console.error('Summary regeneration endpoint error:', error);
    
    if (error.message.includes('OpenAI quota exceeded')) {
      return res.status(429).json({ 
        error: 'Summary regeneration temporarily unavailable. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }
    
    res.status(500).json({ 
      error: 'Summary regeneration failed',
      code: 'REGENERATE_ERROR'
    });
  }
});

// FOLLOW-UP SEARCH ENDPOINT - Search within specific documents only
app.post('/api/search/followup', async (req, res) => {
  try {
    const { query, documentIds = [] } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs are required for follow-up search' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Perform follow-up search within specific documents
    const results = await searchService.searchWithinDocuments(
      user.id, 
      query, 
      documentIds, 
      supabaseAdmin
    );

    res.json(results);

  } catch (error) {
    console.error('Follow-up search endpoint error:', error);
    
    // Handle specific error types
    if (error.message.includes('OpenAI quota exceeded')) {
      return res.status(429).json({ 
        error: 'Search temporarily unavailable due to API quota limits. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }
    
    res.status(500).json({ 
      error: 'Follow-up search failed: Internal Server Error',
      code: 'SEARCH_ERROR'
    });
  }
});

// Load SSL certificates for HTTPS
const certPath = join(__dirname, '..', 'localhost.pem');
const keyPath = join(__dirname, '..', 'localhost-key.pem');

// Check if SSL certificates exist, otherwise fallback to HTTP
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  
  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`✓ API server running on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`⚠️  SSL certificates not found. API server running on http://localhost:${PORT}`);
    console.log(`   Run 'mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1' to enable HTTPS`);
  });
}
