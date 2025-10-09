import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { DocumentSync } from './services/document-sync.js';
import { SearchService } from './services/search-service.js';

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:8080';


app.use(cors({ 
  origin: ['http://localhost:8080', 'http://localhost:8083'],
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
        redirect_uri: `http://localhost:3000/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange failed:', error);
      return res.redirect(`${APP_URL}/connect-sources?error=token_failed`);
    }

    const tokens = await tokenResponse.json();

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId,
        source_type: 'google_drive',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,source_type' 
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.redirect(`${APP_URL}/connect-sources?error=db_failed`);
    }

    return res.redirect(`${APP_URL}/connect-sources?connected=google`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${APP_URL}/connect-sources?error=failed`);
  }
});

// SLACK OAUTH CALLBACK
app.get('/api/auth/slack/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    
    if (Date.now() - stateData.timestamp > 600000) {
      return res.redirect(`${APP_URL}/connect-sources?error=expired`);
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: `http://localhost:3000/api/auth/slack/callback`,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.ok) {
      console.error('Slack token exchange failed:', tokens);
      return res.redirect(`${APP_URL}/connect-sources?error=token_failed`);
    }

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId,
        source_type: 'slack',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: null, // Slack tokens don't expire
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,source_type' 
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.redirect(`${APP_URL}/connect-sources?error=db_failed`);
    }

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
        redirect_uri: `http://localhost:3000/api/auth/notion/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Notion token exchange failed:', error);
      return res.redirect(`${APP_URL}/connect-sources?error=token_failed`);
    }

    const tokens = await tokenResponse.json();

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: stateData.userId,
        source_type: 'notion',
        access_token: tokens.access_token,
        refresh_token: null, // Notion doesn't provide refresh tokens
        token_expires_at: null, // Notion tokens don't expire
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,source_type' 
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.redirect(`${APP_URL}/connect-sources?error=db_failed`);
    }

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

    // Get document count and last sync time
    const { data: documents, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, synced_at, created_at')
      .eq('user_id', user.id)
      .eq('source_type', 'google_drive')
      .order('synced_at', { ascending: false });

    if (docError) {
      console.error('Error fetching documents:', docError);
      return res.status(500).json({ error: 'Failed to fetch sync status' });
    }

    const totalDocuments = documents?.length || 0;
    const lastSyncTime = documents?.[0]?.synced_at || null;

    // Get chunk count for Google Drive documents only
    const { data: chunks, error: chunkError } = await supabaseAdmin
      .from('document_chunks')
      .select('id')
      .eq('user_id', user.id)
      .in('document_id', documents?.map(d => d.id) || []);

    const totalChunks = chunks?.length || 0;

    res.json({
      totalDocuments,
      totalChunks,
      lastSyncTime,
      isSyncing: false
    });

  } catch (error) {
    console.error('Sync status endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CLEAR DATA ENDPOINT (for testing)
app.post('/api/clear-data', async (req, res) => {
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
    
    // Delete all documents and chunks for this user
    await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('user_id', user.id);
    
    await supabaseAdmin
      .from('documents')
      .delete()
      .eq('user_id', user.id);
    
    console.log(`✓ Cleared all data for user ${user.id}`);
    res.json({ success: true, message: 'All data cleared' });
    
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
    
    // Delete synced documents
    await supabaseAdmin
      .from('documents')
      .delete()
      .eq('user_id', user.id)
      .eq('source_type', sourceType);
    
    console.log(`✓ Disconnected ${sourceType} for user ${user.id}`);
    res.json({ success: true });
    
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

app.listen(PORT, () => {
  console.log(`✓ API server running on http://localhost:${PORT}`);
});
