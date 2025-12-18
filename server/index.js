import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env.local, but don't fail if it doesn't exist
try {
  dotenv.config({ path: join(__dirname, '..', '.env.local') });
} catch (error) {
  console.log('No .env.local file found, using environment variables from Vercel');
}

import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { DocumentSync } from './services/document-sync.js';
import { GoogleDriveSync } from './services/google-drive-sync.js';
import { SearchService } from './services/search-service.js';
import { PRDAssemblyService } from './services/prd-assembly.js';
import { WireframeAnalysisService } from './services/wireframe-analysis-service.js';
import { NotionSync } from './services/notion-sync.js';
import { SlackSync } from './services/slack-sync.js';
import { JiraAuthService } from './services/jira-auth.js';
import { JiraApiService } from './services/jira-api.js';
import { TicketDraftingService } from './services/ticket-drafting.js';
import { JiraSyncService } from './services/jira-sync.js';
import { DriftDetectionService } from './services/drift-detection.js';
import multer from 'multer';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://localhost:8081';
const API_BASE_URL = process.env.API_BASE_URL || `https://localhost:${PORT}`;


app.use(cors({ 
  origin: [
    'https://localhost:8081', 
    'http://localhost:8081',
    'https://source-searcher-pro.vercel.app',
    'https://source-searcher-pro-git-main-saiashishpalai.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true 
}));
// Increase body size limits to accommodate base64-encoded wireframe uploads (default is 100kb)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Minimal request logger for sync endpoints to aid debugging during development
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/sync')) {
    console.log(`⇢ ${req.method} ${req.path}`);
  }
  next();
});

// Serve static files from the dist directory (AFTER API routes to avoid conflicts)
// Moved to end of file - see bottom

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.error('Please set these environment variables in Render');
  process.exit(1);
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
);

// Initialize services
const documentSync = new DocumentSync(process.env.OPENAI_API_KEY);
const googleDriveSync = new GoogleDriveSync(process.env.OPENAI_API_KEY, supabaseAdmin);
const searchService = new SearchService(process.env.OPENAI_API_KEY);
const prdAssemblyService = new PRDAssemblyService(process.env.OPENAI_API_KEY);
const wireframeAnalysisService = new WireframeAnalysisService(process.env.OPENAI_API_KEY);
const notionSync = new NotionSync(process.env.OPENAI_API_KEY, supabaseAdmin);
const slackSync = new SlackSync(process.env.OPENAI_API_KEY, supabaseAdmin);
const jiraAuthService = new JiraAuthService(supabaseAdmin);
const ticketDraftingService = new TicketDraftingService(process.env.OPENAI_API_KEY, supabaseAdmin);
const jiraSyncService = new JiraSyncService(supabaseAdmin);
const driftDetectionService = new DriftDetectionService(process.env.OPENAI_API_KEY, supabaseAdmin);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Start Jira sync service (only in production or if explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_JIRA_SYNC === 'true') {
  jiraSyncService.startPeriodicSync();
}

// Multer setup for audio uploads
const uploadAudio = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '.webm';
      cb(null, `stt_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Speech-to-Text (Whisper) - Push-to-Talk transcription
app.post('/api/speech/transcribe', uploadAudio.single('audio'), async (req, res) => {
  const start = Date.now();
  let tempPath = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'invalid_audio', message: 'No audio file provided' });
    }

    tempPath = req.file.path;
    const language = req.body?.language || 'en'; // Default to English if not specified

    // Validate mime type
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a'];
    if (req.file.mimetype && !allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'invalid_audio', message: `Unsupported file type: ${req.file.mimetype}` });
    }

    // Create transcription
    const fileStream = fs.createReadStream(tempPath);
    let result;
    try {
      // Prefer whisper-1 for broad availability
      // Always set language to ensure consistent English transcription
      result = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: language // Explicitly set language (defaults to 'en')
      });
    } catch (e) {
      // Map upstream errors to structured taxonomy
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('too large') || msg.includes('payload')) {
        return res.status(413).json({ error: 'payload_too_large', message: 'Audio too large' });
      }
      if (msg.includes('length') || msg.includes('too long')) {
        return res.status(400).json({ error: 'transcription_failed', message: 'Audio too long' });
      }
      if (msg.includes('unsupported') || msg.includes('file type')) {
        return res.status(400).json({ error: 'invalid_audio', message: 'Unsupported audio format' });
      }
      if (e?.status === 401) {
        return res.status(502).json({ error: 'upstream_error', message: 'OpenAI auth failed' });
      }
      console.error('Whisper upstream error:', e);
      return res.status(502).json({ error: 'upstream_error', message: 'OpenAI service unavailable' });
    }

    const text = result?.text || result?.data?.text || '';
    return res.json({ text, duration_ms: Date.now() - start });
  } catch (e) {
    console.error('Transcription error:', e);
    return res.status(500).json({ error: 'transcription_failed', message: 'Unexpected error' });
  } finally {
    if (tempPath) {
      fs.unlink(tempPath, () => {});
    }
  }
});

// Storage: Upload wireframe via service role to avoid client JWT issues
app.post('/api/storage/upload-wireframe', upload.single('file'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const file = req.file;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const objectName = `${user.id}-${Date.now()}.${ext}`; // flat filename to match RLS policy

    const { error: uploadError } = await supabaseAdmin.storage
      .from('wireframes')
      .upload(objectName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Wireframe storage upload error:', uploadError);
      return res.status(400).json({ error: uploadError.message || 'Upload failed' });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('wireframes')
      .getPublicUrl(objectName);

    return res.json({
      success: true,
      path: objectName,
      url: publicUrlData?.publicUrl,
      metadata: {
        filename: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        mime: file.mimetype,
      },
    });
  } catch (e) {
    console.error('Upload wireframe endpoint error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check environment variables
app.get('/api/debug/env', (req, res) => {
  res.json({
    google_client_id: process.env.GOOGLE_CLIENT_ID ? '✅ Found' : '❌ Missing',
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET ? '✅ Found' : '❌ Missing',
    slack_client_id: process.env.SLACK_CLIENT_ID ? '✅ Found' : '❌ Missing',
    slack_client_secret: process.env.SLACK_CLIENT_SECRET ? '✅ Found' : '❌ Missing',
    notion_client_id: process.env.NOTION_CLIENT_ID ? '✅ Found' : '❌ Missing',
    notion_client_secret: process.env.NOTION_CLIENT_SECRET ? '✅ Found' : '❌ Missing',
    supabase_url: process.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing'
  });
});

// Debug endpoint to test database save
app.get('/api/debug/db-test', async (req, res) => {
  try {
    console.log('🧪 Testing database save...');
    
    const testConnection = {
      user_id: 'b7a5b22c-34f5-446a-8627-112f70ba11b2',
      source_type: 'teams', // Use valid source_type
      source_user_id: 'test-user',
      access_token: 'test-token',
      is_active: true
    };
    
    const { data, error } = await supabaseAdmin
      .from('user_connections')
      .insert(testConnection)
      .select();
    
    if (error) {
      console.error('❌ Database save failed:', error);
      return res.json({ 
        status: 'failed', 
        error: error.message,
        details: error
      });
    }
    
    console.log('✅ Database save successful:', data);
    res.json({ 
      status: 'success', 
      data: data,
      message: 'Database save test passed'
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// Test endpoint to check Slack file access
app.get('/api/test/slack-file-access', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user's Slack access token
    const { data: userSource, error: sourceError } = await supabaseAdmin
      .from('user_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('source_type', 'slack')
      .eq('is_active', true)
      .single();

    if (sourceError || !userSource) {
      return res.status(404).json({ 
        error: 'Slack not connected for this user',
        details: sourceError?.message 
      });
    }

    // Test file access with more detailed debugging
    const slack = new (await import('@slack/web-api')).WebClient(userSource.access_token);
    
    // Get files with more detailed info
    let allFiles = [];
    try {
      const filesResult = await slack.files.list({
        count: 50,
        types: 'all',
        ts_from: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
      });
      allFiles = filesResult.files || [];
      console.log(`🔍 Found ${allFiles.length} files in last 30 days`);
    } catch (error) {
      console.log('Error getting files:', error.message);
    }
    
    const fileAccessResult = await slackSync.testRemoteFileAccess(slack);

    // Get additional debugging info (reuse existing slack client)
    let channels = [];
    try {
      const channelsResult = await slack.conversations.list({
        types: 'public_channel,private_channel,im,mpim',
        limit: 10
      });
      channels = channelsResult.channels || [];
    } catch (error) {
      console.log('Error getting channels:', error.message);
    }

    res.json({
      success: fileAccessResult.success,
      message: fileAccessResult.success 
        ? `Remote files access confirmed: ${fileAccessResult.fileCount} files accessible`
        : `Remote files access failed: ${fileAccessResult.error}`,
      fileCount: fileAccessResult.fileCount,
      files: fileAccessResult.files,
      debug: {
        channelsCount: channels.length,
        channelNames: channels.map(c => c.name).slice(0, 5),
        botHasAccess: channels.length > 0,
        allFilesCount: allFiles.length,
        recentFiles: allFiles.slice(0, 3).map(f => ({
          name: f.name,
          type: f.filetype,
          size: f.size,
          created: new Date(f.created * 1000).toISOString(),
          channels: f.channels,
          url_private: f.url_private,
          url_private_download: f.url_private_download,
          is_public: f.is_public,
          public_url_shared: f.public_url_shared
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Slack file access test error:', error);
    res.status(500).json({ 
      error: 'Failed to test Slack file access',
      details: error.message 
    });
  }
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

// SAVE OAUTH CREDENTIALS
app.post('/api/oauth-credentials/save', async (req, res) => {
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

    const { provider, client_id, client_secret, redirect_uri } = req.body;

    // Validate inputs
    if (!provider || !client_id || !client_secret || !redirect_uri) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate provider
    const validProviders = ['google', 'slack', 'notion'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Map provider to source_type
    const sourceType = provider === 'google' ? 'google_drive' : provider;

    // Validate redirect URI format
    try {
      new URL(redirect_uri);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid redirect URI format' });
    }

    // Encrypt client_secret using Supabase function
    const { data: encryptedData, error: encryptError } = await supabaseAdmin
      .rpc('encrypt_client_secret', {
        secret: client_secret,
        user_id: user.id
      });

    if (encryptError) {
      console.error('Encryption error:', encryptError);
      return res.status(500).json({ error: 'Failed to encrypt credentials' });
    }

    // Upsert credentials into user_connections
    // Use a special record to store credentials separately from actual connections
    const { error: upsertError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: user.id,
        source_type: sourceType,
        source_user_id: 'credentials_only', // Placeholder
        access_token: '', // Empty for credentials-only record
        client_id: client_id,
        client_secret_encrypted: encryptedData,
        redirect_uri: redirect_uri,
        credentials_configured_at: new Date().toISOString(),
        is_active: false, // Not a real connection yet
        metadata: { credentials_only: true }
      }, {
        onConflict: 'user_id,source_type',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      return res.status(500).json({ error: 'Failed to save credentials' });
    }

    console.log(`✓ OAuth credentials saved for user ${user.id}, provider ${provider}`);
    
    return res.json({ 
      success: true, 
      message: 'OAuth credentials saved successfully' 
    });

  } catch (error) {
    console.error('Save OAuth credentials error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET OAUTH CREDENTIALS
app.get('/api/oauth-credentials/get', async (req, res) => {
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

    const { provider } = req.query;

    // Validate provider
    const validProviders = ['google', 'slack', 'notion'];
    if (!provider || !validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid or missing provider' });
    }

    // Map provider to source_type
    const sourceType = provider === 'google' ? 'google_drive' : provider;

    // Fetch credentials from user_connections
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from('user_connections')
      .select('client_id, client_secret_encrypted, redirect_uri, credentials_configured_at')
      .eq('user_id', user.id)
      .eq('source_type', sourceType)
      .single();

    if (fetchError || !connection) {
      return res.status(404).json({ 
        error: 'No credentials found',
        hasCredentials: false 
      });
    }

    // Check if credentials are configured
    if (!connection.client_id || !connection.client_secret_encrypted) {
      return res.status(404).json({ 
        error: 'No credentials found',
        hasCredentials: false 
      });
    }

    // Decrypt client_secret using Supabase function
    const { data: decryptedSecret, error: decryptError } = await supabaseAdmin
      .rpc('decrypt_client_secret', {
        encrypted: connection.client_secret_encrypted,
        user_id: user.id
      });

    if (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(500).json({ error: 'Failed to decrypt credentials' });
    }

    return res.json({
      hasCredentials: true,
      client_id: connection.client_id,
      client_secret: decryptedSecret,
      redirect_uri: connection.redirect_uri,
      configured_at: connection.credentials_configured_at
    });

  } catch (error) {
    console.error('Get OAuth credentials error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GOOGLE OAUTH INITIAL REDIRECT
app.get('/api/auth/google', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    const stateWithUserId = `${state}:${userId}`;

    const authorizationUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(`${API_BASE_URL}/api/auth/google/callback`)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}&` +
      `state=${stateWithUserId}&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log('🔗 Redirecting to Google OAuth:', authorizationUrl);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    res.status(500).json({ error: 'OAuth redirect failed' });
  }
});

// GOOGLE OAUTH CALLBACK - COMPLETE IMPLEMENTATION
app.get('/api/auth/google/callback', async (req, res) => {
  console.log('🎯 GOOGLE OAUTH CALLBACK RECEIVED!');
  console.log('   Query params:', req.query);
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.log('❌ Missing code or state');
      return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
    }
    
    // Parse state format: "randomHex:userId"
    const [stateHex, userId] = state.split(':');
    console.log('   Parsed state - hex:', stateHex?.substring(0, 10) + '...', 'userId:', userId);
    
    if (!userId) {
      console.log('❌ Invalid state format');
      return res.redirect(`${APP_URL}/connect-sources?error=invalid_state`);
    }
    
    // Use OAuth credentials from environment variables (original architecture)
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    console.log('   Using clientId:', clientId ? '✅ Found' : '❌ Missing');

    if (!clientId || !clientSecret) {
      console.error('❌ Google OAuth credentials not configured');
      return res.redirect(`${APP_URL}/connect-sources?error=no_credentials`);
    }
    
    console.log('🔄 Attempting Google token exchange...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${API_BASE_URL}/api/auth/google/callback`,
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
        user_id: userId,
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

    return res.redirect(`${APP_URL}/connected-sources?connected=google`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${APP_URL}/connect-sources?error=failed`);
  }
});

// SLACK OAUTH INITIAL REDIRECT
app.get('/api/auth/slack', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Slack OAuth not configured' });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    const stateWithUserId = `${state}:${userId}`;

    // Bot token scopes (for app functionality)
    const botScopes = 'channels:history,files:read,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read,remote_files:read,team:read,usergroups:read,users:read,users:read.email';
    
    // User token scopes (for user data access - this will give us xoxp- tokens)
    const userScopes = 'channels:read,channels:history,files:read,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read,users:read,team:read';

    const authorizationUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(`${API_BASE_URL}/api/auth/slack/callback`)}&` +
      `scope=${encodeURIComponent(botScopes)}&` +
      `user_scope=${encodeURIComponent(userScopes)}&` +
      `state=${stateWithUserId}`;

    console.log('🔗 Redirecting to Slack OAuth:', authorizationUrl);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error('Slack OAuth redirect error:', error);
    res.status(500).json({ error: 'OAuth redirect failed' });
  }
});

// SLACK OAUTH CALLBACK
app.get('/api/auth/slack/callback', async (req, res) => {
  console.log('🎯 SLACK CALLBACK RECEIVED!');
  console.log('   Query params:', req.query);
  
  const { code, state } = req.query;
  
  if (!code || !state) {
    console.log('❌ Missing code or state in callback');
    return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
  }

  try {
    // Parse state format: "randomHex:userId"
    const [stateHex, userId] = state.split(':');
    console.log('   Parsed state - hex:', stateHex?.substring(0, 10) + '...', 'userId:', userId);
    
    if (!userId) {
      console.log('❌ Invalid state format');
      return res.redirect(`${APP_URL}/connect-sources?error=invalid_state`);
    }

    // Use OAuth credentials from environment variables (original architecture)
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    console.log('   Using clientId:', clientId ? '✅ Found' : '❌ Missing');

    if (!clientId || !clientSecret) {
      console.error('Slack OAuth credentials not configured');
      return res.redirect(`${APP_URL}/connect-sources?error=no_credentials`);
    }

    console.log('🔄 Attempting Slack token exchange...');
    console.log('   Code:', code.substring(0, 20) + '...');
    console.log('   Client ID:', clientId);
    console.log('   Redirect URI:', `${API_BASE_URL}/api/auth/slack/callback`);
    
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
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
      hasAccessToken: !!tokens.access_token,
      hasAuthedUserToken: !!tokens.authed_user?.access_token,
      tokenType: tokens.authed_user?.access_token ? 'user' : 'app',
      scopes: tokens.scope
    });

    const { error: dbError } = await supabaseAdmin
      .from('user_connections')
      .upsert({
        user_id: userId,
        source_type: 'slack',
        source_user_id: slackUserId, // Required by schema
        access_token: tokens.authed_user?.access_token || tokens.access_token, // Use user token for sync
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

    return res.redirect(`${APP_URL}/connected-sources?connected=slack`);
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    return res.redirect(`${APP_URL}/connect-sources?error=failed`);
  }
});

// NOTION OAUTH INITIAL REDIRECT
app.get('/api/auth/notion', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Notion OAuth not configured' });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    const stateWithUserId = `${state}:${userId}`;

    const authorizationUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(`${API_BASE_URL}/api/auth/notion/callback`)}&` +
      `response_type=code&` +
      `owner=user&` +
      `state=${stateWithUserId}`;

    console.log('🔗 Redirecting to Notion OAuth:', authorizationUrl);
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error('Notion OAuth redirect error:', error);
    res.status(500).json({ error: 'OAuth redirect failed' });
  }
});

// NOTION OAUTH CALLBACK
app.get('/api/auth/notion/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.redirect(`${APP_URL}/connect-sources?error=missing_params`);
  }

  try {
    // Parse state format: "randomHex:userId"
    const [stateHex, userId] = state.split(':');
    
    if (!userId) {
      return res.redirect(`${APP_URL}/connect-sources?error=invalid_state`);
    }

    // Use OAuth credentials from environment variables (original architecture)
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Notion OAuth credentials not configured');
      return res.redirect(`${APP_URL}/connect-sources?error=no_credentials`);
    }

    // Notion uses Basic Auth with base64 encoded client_id:client_secret
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

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
        user_id: userId,
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

    return res.redirect(`${APP_URL}/connected-sources?connected=notion`);
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
      .select('access_token, refresh_token, token_expires_at')
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
    
    // Check if token is expired or close to expiring (within 5 minutes)
    let accessToken = connection.access_token;
    const now = new Date();
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // If token is expired or will expire soon, refresh it
    if (expiresAt && expiresAt < fiveMinutesFromNow && connection.refresh_token) {
      console.log('🔄 Access token expired or expiring soon, refreshing...');
      
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        
        if (!refreshResponse.ok) {
          console.error('✗ Token refresh failed:', await refreshResponse.text());
          return res.status(401).json({ 
            error: 'Google OAuth token expired and refresh failed',
            code: 'TOKEN_EXPIRED',
            message: 'Please reconnect Google Drive'
          });
        }
        
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        const newExpiresAt = refreshData.expires_in 
          ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          : null;
        
        await supabaseAdmin
          .from('user_connections')
          .update({
            access_token: accessToken,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('source_type', 'google_drive');
        
        console.log('✅ Token refreshed successfully');
      } catch (refreshError) {
        console.error('✗ Token refresh error:', refreshError.message);
        return res.status(401).json({ 
          error: 'Google OAuth token refresh failed',
          code: 'TOKEN_EXPIRED',
          message: 'Please reconnect Google Drive'
        });
      }
    }
    
    // Validate OAuth token first (with timeout)
    console.log('🔍 Testing Google Drive token...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let testResponse;
    try {
      testResponse = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        { 
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.error('✗ OAuth token validation timed out');
        return res.status(504).json({ 
          error: 'Google OAuth validation timed out',
          code: 'TOKEN_VALIDATION_TIMEOUT'
        });
      }
      console.error('✗ OAuth token validation failed:', e.message);
      return res.status(500).json({ error: 'Validation failed', code: 'VALIDATION_FAILED' });
    } finally {
      clearTimeout(timeoutId);
    }
    
    console.log(`📊 Token test response: ${testResponse.status} ${testResponse.ok ? 'OK' : 'FAILED'}`);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('✗ OAuth token invalid:', errorText);
      
      // Don't disconnect automatically - just return error
      return res.status(401).json({ 
        error: 'Google OAuth token expired',
        code: 'TOKEN_EXPIRED',
        message: 'Please reconnect Google Drive'
      });
    }
    
    console.log('✅ OAuth token is valid');
    
    // Call incremental sync service
    const result = await googleDriveSync.syncGoogleDriveIncremental(
      user.id,
      accessToken
    );
    
    console.log(`✓ Sync complete: ${result.synced} documents, ${result.skipped} skipped`);
    
    res.json(result);
    
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
      .select('access_token, metadata')
      .eq('user_id', user.id)
      .eq('source_type', 'slack')
      .single();
    
    if (connError || !connection) {
      console.error('❌ Slack connection not found:', connError);
      return res.status(400).json({ 
        error: 'Slack not connected',
        code: 'NOT_CONNECTED'
      });
    }
    
    console.log('✓ Starting Slack sync for user:', user.id);
    console.log('🔑 Access token preview:', connection.access_token ? `${connection.access_token.substring(0, 20)}...` : 'MISSING');
    console.log('📊 Connection metadata:', connection.metadata);
    
    // Check if token is a bot token (starts with xoxb-)
    if (connection.access_token && connection.access_token.startsWith('xoxb-')) {
      console.error('❌ ERROR: Bot token detected! User tokens should start with xoxp-');
      return res.status(400).json({
        error: 'Invalid token type. Please reconnect your Slack account.',
        code: 'INVALID_TOKEN_TYPE',
        details: 'Bot token cannot be used for user data sync'
      });
    }
    
    // Call sync service
    const result = await slackSync.syncSlack(user.id, connection.access_token);
    
    console.log(`✓ Slack sync complete: ${result.synced} conversations`);
    
    res.json(result);
    
  } catch (error) {
    console.error('✗ Slack sync error:', error);
    console.error('✗ Error details:', {
      message: error.message,
      code: error.code,
      data: error.data
    });
    
    if (error.code === 'slack_api_error') {
      return res.status(401).json({ 
        error: `Slack API error: ${error.data?.error || error.message}`,
        code: 'SLACK_API_ERROR',
        details: error.data
      });
    }
    
    if (error.message.includes('not_authed') || error.message.includes('invalid_auth')) {
      return res.status(401).json({ 
        error: 'Slack authentication failed. Please reconnect your Slack account.',
        code: 'AUTH_FAILED'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Sync failed',
      code: 'SYNC_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

        // For Slack, get additional file statistics
        let filesProcessed = 0;
        let filesTotal = 0;
        
        if (sourceType === 'slack') {
          // Count files by checking documents with file metadata
          const { data: slackFiles } = await supabaseAdmin
            .from('documents')
            .select('id, metadata')
            .eq('user_id', user.id)
            .eq('source_type', 'slack')
            .not('metadata->file_type', 'is', null);
          
          filesTotal = slackFiles?.length || 0;
          filesProcessed = slackFiles?.length || 0; // For now, assume all files are processed
          
          console.log(`📊 Slack file stats for user ${user.id}: ${filesProcessed}/${filesTotal} files`);
        }

        statsBySource[sourceType] = {
          totalDocuments,
          totalChunks: chunks?.length || 0,
          lastSyncTime,
          isSyncing: false,
          ...(sourceType === 'slack' && { filesProcessed, filesTotal })
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
    
    // CRITICAL FIX: Delete sync metadata so next sync is a full sync
    await supabaseAdmin
      .from('sync_metadata')
      .delete()
      .eq('user_id', user.id)
      .eq('source_type', sourceType);
    
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

// Rate limiting for disconnect operations
const disconnectAttempts = new Map();

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
    
    // Rate limiting: prevent rapid disconnect/reconnect attempts
    const userKey = `${user.id}_${sourceType}`;
    const now = Date.now();
    const lastAttempt = disconnectAttempts.get(userKey);
    
    if (lastAttempt && (now - lastAttempt) < 5000) { // 5 second cooldown
      console.log(`⏳ Rate limiting disconnect for ${userKey}`);
      return res.status(429).json({ 
        error: 'Please wait before disconnecting again',
        code: 'RATE_LIMITED'
      });
    }
    
    disconnectAttempts.set(userKey, now);
    
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

// PRD: Dual-phase search for sections (BM25 instant → Hybrid delayed)
// MUST be before /api/search to avoid route collision
app.post('/api/search/sections', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { query, prd_version_id, section_id, user_context = {}, expanded_context, hybrid = false } = req.body || {};

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Perform dual-phase search with expanded context
    const searchResult = await searchService.searchForSections(
      user.id,
      query.trim(),
      supabaseAdmin,
      {
        prd_version_id,
        section_id,
        user_context,
        expanded_context, // Pass expanded context for iterative grounding
        limit: 8
      }
    );

    // If hybrid=true, perform both phases and return hybrid results
    if (hybrid) {
      const phase2Result = await searchResult.performHybridSearch();
      return res.json({
        phase: 'hybrid',
        query_hash: phase2Result.query_hash,
        results: phase2Result.results,
        search_time_ms: phase2Result.search_time_ms,
        bm25_count: phase2Result.bm25_count,
        vector_count: phase2Result.vector_count,
        merged_count: phase2Result.merged_count,
        timestamp: phase2Result.timestamp
      });
    }

    // Default: Return Phase 1 (BM25) immediately
    // Client can make a follow-up request with hybrid=true and query_hash to get Phase 2
    res.json(searchResult.phase1);

    // Optionally start Phase 2 in background (non-blocking)
    // Store in cache for potential follow-up request
    searchResult.performHybridSearch().then(phase2Result => {
      // Store in a simple cache for follow-up requests (optional)
      // For now, client will make a second request with hybrid=true
      console.log(`✅ Phase 2 hybrid search completed for query_hash: ${phase2Result.query_hash}`);
    }).catch(err => {
      console.error('❌ Background Phase 2 search error:', err);
    });

  } catch (e) {
    console.error('Search sections error:', e);
    res.status(500).json({ error: 'Failed to search sections' });
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

// PRD: Generate section draft from context (AI Draft Generation)
app.post('/api/prd/sections/suggest', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { prd_version_id, section_id, user_text = '', chunk_ids = [] } = req.body || {};

    if (!prd_version_id || !section_id) {
      return res.status(400).json({ error: 'prd_version_id and section_id are required' });
    }

    // Verify PRD ownership
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', prd_version_id)
      .eq('user_id', user.id)
      .single();
    
    if (prdError || !prd) {
      return res.status(403).json({ error: 'PRD not found or access denied' });
    }

    // Fetch chunks by IDs
    let chunks = [];
    if (chunk_ids.length > 0) {
      const { data: chunkData, error: chunkError } = await supabaseAdmin
        .from('document_chunks')
        .select('id, content, document_id, metadata')
        .in('id', chunk_ids)
        .eq('user_id', user.id);
      
      if (chunkError) {
        console.error('Error fetching chunks:', chunkError);
        return res.status(500).json({ error: 'Failed to fetch chunks' });
      }

      // Fetch document metadata for chunks
      if (chunkData && chunkData.length > 0) {
        const documentIds = [...new Set(chunkData.map(c => c.document_id).filter(Boolean))];
        const { data: documents } = await supabaseAdmin
          .from('documents')
          .select('id, title, source_type, synced_at')
          .in('id', documentIds);

        const docMap = new Map();
        documents?.forEach(doc => docMap.set(doc.id, doc));

        // Format chunks with metadata
        chunks = chunkData.map(chunk => {
          const doc = docMap.get(chunk.document_id);
          return {
            id: chunk.id,
            chunk_id: chunk.id,
            document_id: chunk.document_id,
            content: chunk.content || '',
            title: doc?.title || chunk.metadata?.title || 'Document',
            source: doc?.source_type || chunk.metadata?.source_type || 'unknown',
            timestamp: doc?.synced_at || chunk.metadata?.synced_at || new Date().toISOString(),
            metadata: chunk.metadata || {}
          };
        });
      }
    }

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No chunks provided. Please search and select context first.' });
    }

    // Generate draft using GPT-4
    const result = await searchService.generatePRDSectionDraft(user_text, chunks, section_id);

    res.json({
      draft: result.draft,
      citations: result.citations
    });

  } catch (e) {
    console.error('Suggest section error:', e);
    res.status(500).json({ error: e.message || 'Failed to generate draft' });
  }
});

// PRD: Assemble final PRD document from all sections
app.post('/api/prd/assemble', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { prd_version_id, sections = {}, citations = [] } = req.body || {};

    if (!prd_version_id) {
      return res.status(400).json({ error: 'prd_version_id is required' });
    }

    // Verify PRD ownership
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('id, title, user_id')
      .eq('id', prd_version_id)
      .eq('user_id', user.id)
      .single();
    
    if (prdError || !prd) {
      return res.status(403).json({ error: 'PRD not found or access denied' });
    }

    // Fetch citation chunk contents if provided
    let citationContents = [];
    if (citations && citations.length > 0) {
      citationContents = await prdAssemblyService.fetchCitationContents(
        citations,
        supabaseAdmin,
        user.id
      );
    }

    // Generate final PRD
    const result = await prdAssemblyService.generateFinalPRD({
      sections: {
        objective: sections.objective || '',
        background: sections.background || '',
        scope: sections.scope || '',
        requirements: sections.requirements || '',
        metrics: sections.metrics || '',
        timeline: sections.timeline || '',
        dependencies: sections.dependencies || ''
      },
      citations: citationContents,
      supabaseAdmin,
      userId: user.id
    });

    // Store assembled text in database (update prd_versions)
    await supabaseAdmin
      .from('prd_versions')
      .update({ 
        assembled_text: result.prd_text,
        updated_at: new Date().toISOString()
      })
      .eq('id', prd_version_id);

    res.json({
      prd_text: result.prd_text,
      structured_sections: result.structured_sections,
      summary: result.summary,
      citations_used: result.citations_used
    });

  } catch (e) {
    console.error('PRD assembly error:', e);
    res.status(500).json({ error: e.message || 'Failed to assemble PRD' });
  }
});

// PRD: Create new PRD version
app.post('/api/prd/create', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { title } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title required' });
    }

    // Create new PRD with version_group_id (new group for this PRD family)
    const versionGroupId = crypto.randomUUID();
    
    const { data: prd, error } = await supabaseAdmin
      .from('prd_versions')
      .insert({ 
        user_id: user.id, 
        title: title.trim(), 
        version: 1,
        version_group_id: versionGroupId,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    
    res.json({ prd });
  } catch (e) {
    console.error('Create PRD error:', e);
    res.status(500).json({ error: 'Failed to create PRD' });
  }
});

// PRD: Upsert a section for a PRD version
app.post('/api/prd/sections', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { prd_version_id, section_id, content, metadata, citation_chunk_ids = [], wireframe_url, wireframe_metadata } = req.body || {};
    if (!prd_version_id || !section_id || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify ownership via prd_versions
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', prd_version_id)
      .eq('user_id', user.id)
      .single();
    if (prdError || !prd) return res.status(403).json({ error: 'Forbidden' });

    // Build upsert payload - skip wireframe columns until PostgREST cache refreshes
    // Both columns exist in DB but PostgREST schema cache is stale
    const upsertPayload = {
      prd_version_id,
      section_id,
      content,
      ...(metadata ? { metadata } : {}),
      // Temporarily skip wireframe columns until cache refreshes (usually 5-10 min or after service restart)
      // ...(wireframe_url ? { wireframe_url } : {}),
      // ...(wireframe_metadata ? { wireframe_metadata } : {}),
    };

    const { data: section, error } = await supabaseAdmin
      .from('prd_sections')
      .upsert(upsertPayload, { onConflict: 'prd_version_id,section_id' })
      .select()
      .single();

    if (error) {
      console.error('❌ PRD section save error:', error);
      console.error('Request body:', { prd_version_id, section_id, has_wireframe_url: !!wireframe_url, has_wireframe_metadata: !!wireframe_metadata });
      return res.status(500).json({ error: error.message });
    }

    // Store citations if provided
    if (citation_chunk_ids.length > 0) {
      // Fetch chunks to get source_type and document_id
      const { data: chunks, error: chunkError } = await supabaseAdmin
        .from('document_chunks')
        .select('id, document_id')
        .in('id', citation_chunk_ids)
        .eq('user_id', user.id);

      if (!chunkError && chunks && chunks.length > 0) {
        // Fetch documents to get source_type
        const documentIds = [...new Set(chunks.map(c => c.document_id).filter(Boolean))];
        const { data: documents } = await supabaseAdmin
          .from('documents')
          .select('id, source_type')
          .in('id', documentIds);

        const docMap = new Map();
        documents?.forEach(doc => docMap.set(doc.id, doc));

        // Insert citations into prd_source_refs (avoid duplicates)
        const citationsToInsert = [];
        for (const chunk of chunks) {
          const doc = docMap.get(chunk.document_id);
          if (doc && doc.source_type) {
            // Check if citation already exists
            const { data: existing, error: checkError } = await supabaseAdmin
              .from('prd_source_refs')
              .select('id')
              .eq('prd_version_id', prd_version_id)
              .eq('section_id', section_id)
              .eq('source_type', doc.source_type)
              .eq('source_id', chunk.document_id)
              .maybeSingle();

            if (!existing && !checkError) {
              citationsToInsert.push({
                prd_version_id,
                section_id,
                source_type: doc.source_type,
                source_id: chunk.document_id
              });
            }
          }
        }

        if (citationsToInsert.length > 0) {
          const { error: citationError } = await supabaseAdmin
            .from('prd_source_refs')
            .insert(citationsToInsert);

          if (citationError) {
            console.error('Error storing citations:', citationError);
            // Don't fail the request, just log the error
          }
        }
      }
    }

    res.json({ section });
  } catch (e) {
    console.error('Save section error:', e);
    res.status(500).json({ error: 'Failed to save section' });
  }
});

// PRD: List user's PRDs (MUST be first to avoid route collision with /api/prd/:id)
app.get('/api/prd/list', async (req, res) => {
  console.log('🔍 PRD list route hit!', req.method, req.path);
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ No auth header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: prds, error } = await supabaseAdmin
      .from('prd_versions')
      .select('id, title, version, status, created_at, updated_at, version_group_id, change_summary, created_by')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ prds: prds || [] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list PRDs' });
  }
});

// PRD: Recent PRDs for dashboard (latest per version group)
// Place before parameterized routes to avoid collisions
app.get('/api/prd/recent', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch latest PRDs ordered by updated_at (limit broader set then dedupe)
    const { data: prds, error } = await supabaseAdmin
      .from('prd_versions')
      .select('id, title, version, version_group_id, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(25);

    if (error) return res.status(500).json({ error: error.message });

    // Deduplicate by version_group_id keeping the first (latest)
    const seen = new Set();
    const unique = [];
    for (const prd of prds || []) {
      if (!seen.has(prd.version_group_id)) {
        seen.add(prd.version_group_id);
        unique.push(prd);
      }
    }

    res.json({ prds: unique.slice(0, 3) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recent PRDs' });
  }
});

// PRD: Delete entire PRD group (all versions)
// Place before parameterized id routes to avoid collisions
app.delete('/api/prd/group/:groupId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { groupId } = req.params;

    // Verify there are PRDs in this group for this user
    const { data: prds, error: fetchError } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('user_id', user.id)
      .eq('version_group_id', groupId);

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!prds || prds.length === 0) return res.status(404).json({ error: 'PRD group not found' });

    // Delete all versions in this group (cascade removes sections/refs)
    const { error: deleteError } = await supabaseAdmin
      .from('prd_versions')
      .delete()
      .eq('user_id', user.id)
      .eq('version_group_id', groupId);

    if (deleteError) return res.status(500).json({ error: deleteError.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete PRD group' });
  }
});

// PRD: Compare two versions (MUST come before /api/prd/:id to avoid route collision)
app.get('/api/prd/compare', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { v1, v2 } = req.query;
    
    if (!v1 || !v2) {
      return res.status(400).json({ error: 'v1 and v2 query parameters required' });
    }

    // Fetch both PRDs with sections
    const { data: prd1, error: error1 } = await supabaseAdmin
      .from('prd_versions')
      .select('*, prd_sections(*)')
      .eq('id', v1)
      .eq('user_id', user.id)
      .single();
    
    const { data: prd2, error: error2 } = await supabaseAdmin
      .from('prd_versions')
      .select('*, prd_sections(*)')
      .eq('id', v2)
      .eq('user_id', user.id)
      .single();

    if (error1 || !prd1 || error2 || !prd2) {
      return res.status(404).json({ error: 'One or both PRDs not found' });
    }

    // Compute section-level diff
    const diff = computeSectionDiff(prd1.prd_sections || [], prd2.prd_sections || []);

    res.json({
      v1: prd1,
      v2: prd2,
      diff
    });
  } catch (e) {
    console.error('Compare versions error:', e);
    res.status(500).json({ error: 'Failed to compare versions' });
  }
});

// PRD: Get specific PRD with sections (MUST come after /api/prd/list and /api/prd/compare to avoid route collision)
app.get('/api/prd/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('PRD fetch auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    console.log(`🔍 Fetching PRD ${id} for user ${user.id}`);
    
    // Query WITHOUT assembled_text (column may not exist)
    const { data: prd, error } = await supabaseAdmin
      .from('prd_versions')
      .select('id, user_id, title, version, status, created_at, updated_at, created_by, prd_sections(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error(`❌ PRD fetch error for ${id}:`, error);
      return res.status(404).json({ error: 'PRD not found', details: error.message });
    }
    
    if (!prd) {
      console.error(`❌ PRD ${id} not found for user ${user.id}`);
      return res.status(404).json({ error: 'PRD not found' });
    }
    
    console.log(`✅ Found PRD ${id}: ${prd.title}`);
    
    // Try to fetch assembled_text separately (if column exists)
    let assembledText = null;
    try {
      const { data: textData } = await supabaseAdmin
        .from('prd_versions')
        .select('assembled_text')
        .eq('id', id)
        .single();
      assembledText = textData?.assembled_text || null;
    } catch (e) {
      // Column doesn't exist - that's fine, frontend will generate from sections
      console.log('assembled_text column not available, using sections');
    }
    
    // Fetch user profile for Created By
    let createdByName = null;
    if (prd.created_by) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('name, email')
        .eq('id', prd.created_by)
        .single();
      if (profile) {
        createdByName = profile.name || profile.email || 'Unknown';
      }
    }
    
    res.json({ 
      prd: {
        ...prd,
        assembled_text: assembledText,
        created_by_name: createdByName
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch PRD' });
  }
});

// PRD: Delete a single PRD version by id
app.delete('/api/prd/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    // Ensure PRD exists and belongs to user
    const { data: prd, error: fetchError } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !prd) return res.status(404).json({ error: 'PRD not found' });

    // Delete PRD (cascade deletes sections/refs)
    const { error: deleteError } = await supabaseAdmin
      .from('prd_versions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) return res.status(500).json({ error: deleteError.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete PRD' });
  }
});

// PRD: Update PRD title or status
app.patch('/api/prd/:id', async (req, res) => {
  try {
    console.log('🔧 PATCH /api/prd/:id called with body:', req.body);
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { title, status } = req.body || {};
    
    console.log('📝 Update request - ID:', id, 'Title:', title, 'Status:', status);
    
    // Build update object
    const updates = { updated_at: new Date().toISOString() };
    
    // Only process title if it's explicitly provided and not empty
    if (title !== undefined && title !== null && title !== '') {
      if (!title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updates.title = title.trim();
    }
    
    // Only process status if it's explicitly provided
    if (status !== undefined && status !== null) {
      if (!['draft', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be draft, published, or archived' });
      }
      updates.status = status;
    }
    
    // Check if we have any actual fields to update (besides updated_at)
    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid fields to update. Provide either title or status.' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('prd_versions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title, version, status, updated_at')
      .single();

    if (error) {
      console.error('Update PRD error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!updated) {
      return res.status(404).json({ error: 'PRD not found or access denied' });
    }
    
    res.json({ prd: updated });
  } catch (e) {
    console.error('Update PRD exception:', e);
    res.status(500).json({ error: e.message || 'Failed to update PRD' });
  }
});

// PRD: Create new version from existing PRD (using atomic database function)
app.post('/api/prd/:id/version', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { change_summary } = req.body || {};
    
    // Helper function for manual version creation (fallback)
    const createVersionManually = async () => {
      console.log('Creating version manually (fallback)...');
      
      // Get original PRD with sections
      const { data: originalPRD, error: fetchError } = await supabaseAdmin
        .from('prd_versions')
        .select('*, prd_sections(*)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError || !originalPRD) {
        return res.status(404).json({ error: 'PRD not found' });
      }

      // Get next version number
      const { data: versions } = await supabaseAdmin
        .from('prd_versions')
        .select('version')
        .eq('version_group_id', originalPRD.version_group_id)
        .order('version', { ascending: false })
        .limit(1);
      
      const nextVersion = versions && versions.length > 0 ? versions[0].version + 1 : originalPRD.version + 1;

      // Create new PRD version
      const { data: createdPRD, error: insertError } = await supabaseAdmin
        .from('prd_versions')
        .insert({
          user_id: user.id,
          title: originalPRD.title,
          version: nextVersion,
          version_group_id: originalPRD.version_group_id,
          status: 'draft',
          change_summary: change_summary || null,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError || !createdPRD) {
        return res.status(500).json({ error: insertError?.message || 'Failed to create new version' });
      }

      // Copy all sections from original to new version
      if (originalPRD.prd_sections && originalPRD.prd_sections.length > 0) {
        const sectionsToInsert = originalPRD.prd_sections.map((section) => ({
          prd_version_id: createdPRD.id,
          section_id: section.section_id,
          content: section.content,
          metadata: section.metadata || {}
        }));

        const { error: sectionsError } = await supabaseAdmin
          .from('prd_sections')
          .insert(sectionsToInsert);

        if (sectionsError) {
          await supabaseAdmin.from('prd_versions').delete().eq('id', createdPRD.id);
          return res.status(500).json({ error: 'Failed to copy sections' });
        }
      }

      // Fetch the complete new PRD with sections
      const { data: completePRD, error: finalError } = await supabaseAdmin
        .from('prd_versions')
        .select('*, prd_sections(*)')
        .eq('id', createdPRD.id)
        .single();

      if (finalError) {
        return res.status(500).json({ error: 'Failed to fetch new version' });
      }

      return res.json({ prd: completePRD });
    };

    // Try using atomic database function first (prevents race conditions)
    let newPRD;
    let createError;
    
    try {
      const result = await supabaseAdmin.rpc('create_prd_version', {
        p_source_prd_id: id,
        p_user_id: user.id,
        p_change_summary: change_summary || null
      });
      
      createError = result.error;
      newPRD = result.data;
    } catch (rpcError) {
      console.error('RPC call exception:', rpcError);
      // If exception thrown, use fallback
      return await createVersionManually();
    }

    if (createError) {
      console.error('Create version RPC error:', JSON.stringify(createError, null, 2));
      // Fallback to manual creation for ANY RPC error (function missing, SQL errors, etc.)
      const shouldFallback = 
        createError.code === '42883' || // Function doesn't exist
        createError.code === '42702' || // Ambiguous column (SQL bug in function)
        createError.message?.includes('does not exist') || 
        createError.message?.includes('function') ||
        createError.message?.includes('ambiguous') ||
        (!createError.code && !createError.message) || // Empty error object
        Object.keys(createError).length === 0; // Empty object
      
      if (shouldFallback) {
        console.log('RPC function error detected, using fallback manual creation...');
        return await createVersionManually();
      }
      // For other errors (like auth), return error but don't fallback
      return res.status(500).json({ error: createError.message || 'Failed to create version' });
    }

    if (!newPRD || newPRD.length === 0) {
      console.error('Create version error: RPC returned empty result', { newPRD, createError });
      return res.status(500).json({ error: 'Failed to create version: No data returned' });
    }

    // Fetch the complete new PRD with sections
    const { data: completePRD, error: finalError } = await supabaseAdmin
      .from('prd_versions')
      .select('*, prd_sections(*)')
      .eq('id', newPRD[0].id)
      .single();

    if (finalError) {
      return res.status(500).json({ error: 'Failed to fetch new version' });
    }

    res.json({ prd: completePRD });
  } catch (e) {
    console.error('Create version error:', e);
    console.error('Error details:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    res.status(500).json({ error: e?.message || 'Failed to create version. Make sure the database migration has been run.' });
  }
});

// PRD: Generate requirements from wireframe (during creation flow)
app.post('/api/prd/generate-requirements-from-wireframe', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { wireframe, context = {}, retrievedChunks = [] } = req.body || {};

    if (!wireframe) {
      return res.status(400).json({ error: 'Wireframe image is required' });
    }

    // Validate wireframe is base64
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Pattern.test(wireframe)) {
      return res.status(400).json({ error: 'Invalid wireframe format. Expected base64 string.' });
    }

    console.log('✓ Generating requirements from wireframe for user:', user.id);

    // Call wireframe analysis service
    const result = await wireframeAnalysisService.generateRequirements(
      wireframe,
      context,
      retrievedChunks
    );

    res.json({
      requirements: result.requirements,
      confidence: result.confidence,
      metadata: result.metadata
    });
  } catch (e) {
    console.error('Generate requirements from wireframe error:', e);
    res.status(500).json({ error: e.message || 'Failed to generate requirements from wireframe' });
  }
});

// PRD: Regenerate requirements from wireframe (for existing PRD)
app.post('/api/prd/regenerate-requirements-from-wireframe', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { prdId, wireframe, existingPRD = {} } = req.body || {};

    if (!wireframe) {
      return res.status(400).json({ error: 'Wireframe image is required' });
    }

    if (!prdId) {
      return res.status(400).json({ error: 'PRD ID is required' });
    }

    // Validate wireframe is base64
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Pattern.test(wireframe)) {
      return res.status(400).json({ error: 'Invalid wireframe format. Expected base64 string.' });
    }

    // Verify PRD ownership
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('id, user_id')
      .eq('id', prdId)
      .eq('user_id', user.id)
      .single();
    
    if (prdError || !prd) {
      return res.status(403).json({ error: 'PRD not found or access denied' });
    }

    console.log('✓ Regenerating requirements from wireframe for PRD:', prdId);

    // Fetch RAG chunks if any citations exist
    let retrievedChunks = [];
    if (existingPRD.citations && existingPRD.citations.length > 0) {
      const citationContents = await prdAssemblyService.fetchCitationContents(
        existingPRD.citations,
        supabaseAdmin,
        user.id
      );
      retrievedChunks = citationContents.map(content => ({ content }));
    }

    // Call wireframe analysis service for regeneration
    const result = await wireframeAnalysisService.regenerateRequirements(
      wireframe,
      existingPRD,
      retrievedChunks
    );

    res.json({
      requirements: result.requirements,
      confidence: result.confidence,
      metadata: result.metadata
    });
  } catch (e) {
    console.error('Regenerate requirements from wireframe error:', e);
    res.status(500).json({ error: e.message || 'Failed to regenerate requirements from wireframe' });
  }
});

// PRD: Generate AI-enhanced section draft
app.post('/api/prd/generate-section-draft', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { section_id, context } = req.body || {};

    if (!section_id) {
      return res.status(400).json({ error: 'Section ID is required' });
    }

    console.log(`✓ Generating AI draft for section: ${section_id}`);

    // Section titles for context
    const sectionTitles = {
      objective: 'Objective',
      background: 'Background',
      scope: 'Scope',
      requirements: 'Requirements',
      metrics: 'Success Metrics',
      access_permissions: 'Access Permissions',
      notifications: 'Notifications',
      reporting: 'Reporting',
      analytics_events: 'Analytics Events',
      filters: 'Filters',
      dependencies: 'Dependencies',
      backward_compatibility: 'Backward Compatibility',
      release_plan: 'Release Plan',
      timeline: 'Timeline'
    };

    const sectionTitle = sectionTitles[section_id] || section_id;

    // Build the prompt
    const systemPrompt = `You are an expert Product Manager and technical writer. Generate a comprehensive, detailed draft for the "${sectionTitle}" section of a Product Requirements Document.

Guidelines:
- Use clear, professional language
- Be specific and actionable
- Include relevant details and examples
- Format using Markdown (use **bold**, bullet points, numbered lists)
- For Requirements, include Functional Requirements (FR-X) and Non-Functional Requirements (NFR-X)
- For Timeline, include specific phases with milestones
- For Success Metrics, include quantifiable KPIs`;

    const userPrompt = `Based on the following PRD context, generate a detailed "${sectionTitle}" section:

**PRD Context:**
${context.objective ? `**Objective:** ${context.objective}` : ''}
${context.background ? `\n**Background:** ${context.background}` : ''}
${context.scope ? `\n**Scope:** ${context.scope}` : ''}
${context.requirements ? `\n**Requirements:** ${context.requirements}` : ''}
${context.currentSection ? `\n\n**Current ${sectionTitle} content (enhance this):**\n${context.currentSection}` : ''}

Generate a comprehensive ${sectionTitle} section now.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const draft = completion.choices[0]?.message?.content || '';

    console.log(`✓ Generated ${draft.length} characters for ${section_id}`);

    res.json({
      draft,
      confidence: 85 // Default confidence for AI-generated drafts
    });
  } catch (e) {
    console.error('Generate section draft error:', e);
    res.status(500).json({ error: e.message || 'Failed to generate section draft' });
  }
});

// PRD: Get all versions of a PRD (by version_group_id)
app.get('/api/prd/:id/versions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    // Get the version_group_id for this PRD
    const { data: basePrd, error: baseError } = await supabaseAdmin
      .from('prd_versions')
      .select('version_group_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (baseError || !basePrd || !basePrd.version_group_id) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Get ALL versions in this group (single query, no title matching)
    const { data: versions, error } = await supabaseAdmin
      .from('prd_versions')
      .select('id, title, version, status, created_at, created_by, change_summary')
      .eq('version_group_id', basePrd.version_group_id)
      .order('version', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ versions: versions || [] });
  } catch (e) {
    console.error('Get versions error:', e);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});


// Helper function to compute section-level diff
function computeSectionDiff(sections1, sections2) {
  const diff = {};
  
  const allSectionIds = new Set([
    ...sections1.map(s => s.section_id),
    ...sections2.map(s => s.section_id)
  ]);
  
  for (const sectionId of allSectionIds) {
    const s1 = sections1.find(s => s.section_id === sectionId);
    const s2 = sections2.find(s => s.section_id === sectionId);
    
    if (!s1) {
      diff[sectionId] = { type: 'added', content: s2.content };
    } else if (!s2) {
      diff[sectionId] = { type: 'removed', content: s1.content };
    } else if (s1.content !== s2.content) {
      diff[sectionId] = { type: 'modified', old: s1.content, new: s2.content };
    } else {
      diff[sectionId] = { type: 'unchanged' };
    }
  }
  
  return diff;
}

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

// LINK DOCUMENT VERSIONS ENDPOINT
app.post('/api/documents/link-versions', async (req, res) => {
  try {
    const { newerDocId, olderDocId } = req.body;
    
    if (!newerDocId || !olderDocId) {
      return res.status(400).json({ error: 'newerDocId and olderDocId are required' });
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
    
    // Verify both documents belong to user
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, source_id, synced_at, version_group_id, metadata')
      .in('id', [newerDocId, olderDocId])
      .eq('user_id', user.id);
    
    if (docsError || docs.length !== 2) {
      return res.status(404).json({ error: 'Documents not found or access denied' });
    }
    
    // Determine which is actually newer
    const [doc1, doc2] = docs;
    const newerDoc = new Date(doc1.synced_at) > new Date(doc2.synced_at) ? doc1 : doc2;
    const olderDoc = newerDoc.id === doc1.id ? doc2 : doc1;
    
    // Create or use existing version group
    const versionGroupId = olderDoc.version_group_id || olderDoc.id;
    
    // Update older document - remove potential_duplicates since they're now linked
    const olderUpdatedMetadata = { ...olderDoc.metadata };
    delete olderUpdatedMetadata.potential_duplicates;
    
    console.log(`🔗 Linking documents: ${olderDoc.id} (older) -> ${newerDoc.id} (newer)`);
    console.log(`🔗 Removing potential_duplicates from older document: ${olderDoc.id}`);
    
    await supabaseAdmin
      .from('documents')
      .update({
        version_group_id: versionGroupId,
        version_number: 1,
        is_latest: false,
        metadata: olderUpdatedMetadata
      })
      .eq('id', olderDoc.id);
    
    // Update newer document - remove potential_duplicates since they're now linked
    const updatedMetadata = { ...newerDoc.metadata };
    delete updatedMetadata.potential_duplicates;
    
    console.log(`🔗 Removing potential_duplicates from newer document: ${newerDoc.id}`);
    
    await supabaseAdmin
      .from('documents')
      .update({
        version_group_id: versionGroupId,
        version_number: 2,
        is_latest: true,
        metadata: {
          ...updatedMetadata,
          previous_version_id: olderDoc.id,
          user_confirmed_version: true
        }
      })
      .eq('id', newerDoc.id);
    
    res.json({ 
      success: true, 
      message: 'Documents linked as versions',
      version_group_id: versionGroupId
    });
    
  } catch (error) {
    console.error('Link versions error:', error);
    res.status(500).json({ error: 'Failed to link versions' });
  }
});

// DISMISS DUPLICATE ENDPOINT
app.post('/api/documents/dismiss-duplicate', async (req, res) => {
  try {
    const { documentId, duplicateId } = req.body;
    
    if (!documentId || !duplicateId) {
      return res.status(400).json({ error: 'documentId and duplicateId are required' });
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
    
    // Get document
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();
    
    if (docError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Remove from potential_duplicates, add to dismissed_duplicates
    const potentialDuplicates = doc.metadata?.potential_duplicates || [];
    const dismissedDuplicates = doc.metadata?.dismissed_duplicates || [];
    
    await supabaseAdmin
      .from('documents')
      .update({
        metadata: {
          ...doc.metadata,
          potential_duplicates: potentialDuplicates.filter(d => d.document_id !== duplicateId),
          dismissed_duplicates: [...dismissedDuplicates, duplicateId]
        }
      })
      .eq('id', documentId);
    
    res.json({ success: true, message: 'Duplicate dismissed' });
    
  } catch (error) {
    console.error('Dismiss duplicate error:', error);
    res.status(500).json({ error: 'Failed to dismiss duplicate' });
  }
});

// DEBUG ENDPOINT: Check if documents have potential_duplicates in metadata
app.get('/api/debug/check-duplicates', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, source_type, metadata')
      .eq('user_id', userId)
      .order('synced_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const analysis = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      source: doc.source_type,
      has_content_vector: !!doc.metadata?.content_vector,
      has_potential_duplicates: !!doc.metadata?.potential_duplicates,
      potential_duplicates_count: doc.metadata?.potential_duplicates?.length || 0,
      potential_duplicates: doc.metadata?.potential_duplicates || null
    }));

    res.json({
      total_documents: documents.length,
      with_duplicates: analysis.filter(a => a.has_potential_duplicates).length,
      documents: analysis
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DEBUG ENDPOINT: Reset dismissed duplicates for testing
app.post('/api/debug/reset-dismissed-duplicates', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Remove potential_duplicates from all documents to reset the state
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, metadata')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Reset metadata to remove potential_duplicates
    for (const doc of documents) {
      if (doc.metadata?.potential_duplicates) {
        const updatedMetadata = { ...doc.metadata };
        delete updatedMetadata.potential_duplicates;
        
        await supabaseAdmin
          .from('documents')
          .update({ metadata: updatedMetadata })
          .eq('id', doc.id);
      }
    }

    res.json({
      message: 'Reset completed - potential_duplicates removed from all documents',
      documents_updated: documents.length
    });
  } catch (error) {
    console.error('Reset endpoint error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});


// ============================================================================
// Jira Integration Routes
// ============================================================================

// Start Jira OAuth flow
app.get('/api/jira/auth/start', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { url, state } = jiraAuthService.getAuthorizationUrl(user.id);
    res.json({ url, state });
  } catch (error) {
    console.error('Jira auth start error:', error);
    res.status(500).json({ 
      error: 'Failed to start Jira authentication',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Handle Jira OAuth callback
app.get('/api/jira/auth/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error('Jira OAuth error:', oauthError);
      return res.redirect(`${APP_URL}/settings?jira_error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return res.redirect(`${APP_URL}/settings?jira_error=missing_params`);
    }

    // Validate state
    const stateData = jiraAuthService.validateState(state);
    if (!stateData) {
      return res.redirect(`${APP_URL}/settings?jira_error=invalid_state`);
    }

    const userId = stateData.userId;

    // Exchange code for tokens
    const tokens = await jiraAuthService.exchangeCodeForTokens(code);

    // Get accessible resources to find Jira site
    const resources = await jiraAuthService.getAccessibleResources(tokens.accessToken);
    
    if (!resources || resources.length === 0) {
      return res.redirect(`${APP_URL}/settings?jira_error=no_jira_access`);
    }

    // Use first available Jira site
    const jiraSite = resources.find(r => r.scopes.includes('read:jira-work')) || resources[0];
    const cloudId = jiraSite.id;
    const siteUrl = jiraSite.url;

    // Get user's Jira profile
    const profile = await jiraAuthService.getJiraUserProfile(tokens.accessToken, cloudId);

    // Save connection
    await jiraAuthService.saveConnection(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      cloudId,
      siteUrl,
      jiraAccountId: profile.accountId,
      jiraEmail: profile.emailAddress,
      jiraDisplayName: profile.displayName,
      scopes: tokens.scope
    });

    res.redirect(`${APP_URL}/settings?jira_connected=true`);
  } catch (error) {
    console.error('Jira OAuth callback error:', error);
    res.redirect(`${APP_URL}/settings?jira_error=${encodeURIComponent(error.message)}`);
  }
});

// Get Jira connection status
app.get('/api/jira/connection', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const status = await jiraAuthService.verifyConnection(user.id);
    res.json(status);
  } catch (error) {
    console.error('Jira connection check error:', error);
    res.status(500).json({ error: 'Failed to check Jira connection' });
  }
});

// Disconnect Jira
app.delete('/api/jira/connection', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    await jiraAuthService.deleteConnection(user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Jira disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Jira' });
  }
});

// Get available Jira projects
app.get('/api/jira/projects', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const connection = await jiraAuthService.getValidConnection(user.id);
    if (!connection) {
      return res.status(404).json({ error: 'Jira not connected' });
    }

    const jiraApi = new JiraApiService(connection.access_token, connection.cloud_id, connection.site_url);
    const projects = await jiraApi.getProjects();
    
    res.json({ 
      projects: projects.map(p => ({
        id: p.id,
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey,
        avatarUrls: p.avatarUrls
      })),
      defaultProject: connection.default_project_key ? {
        key: connection.default_project_key,
        name: connection.default_project_name
      } : null
    });
  } catch (error) {
    console.error('Jira projects error:', error);
    res.status(500).json({ error: error.message || 'Failed to get projects' });
  }
});

// Set default Jira project
app.post('/api/jira/projects/select', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { projectKey } = req.body;
    if (!projectKey) {
      return res.status(400).json({ error: 'projectKey required' });
    }

    const connection = await jiraAuthService.getValidConnection(user.id);
    if (!connection) {
      return res.status(404).json({ error: 'Jira not connected' });
    }

    const jiraApi = new JiraApiService(connection.access_token, connection.cloud_id, connection.site_url);
    
    // Get project details and issue types
    const project = await jiraApi.getProject(projectKey);
    const issueTypes = await jiraApi.getProjectIssueTypes(projectKey);

    // Update default project
    const updated = await jiraAuthService.updateDefaultProject(user.id, {
      projectKey: project.key,
      projectId: project.id,
      projectName: project.name,
      issueTypes: issueTypes.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        subtask: t.subtask,
        hierarchyLevel: t.hierarchyLevel
      }))
    });

    res.json({ 
      success: true,
      project: {
        key: project.key,
        name: project.name,
        issueTypes: updated.available_issue_types
      }
    });
  } catch (error) {
    console.error('Jira project select error:', error);
    res.status(500).json({ error: error.message || 'Failed to set default project' });
  }
});

// Get issue types for a project
app.get('/api/jira/projects/:projectKey/types', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { projectKey } = req.params;

    const connection = await jiraAuthService.getValidConnection(user.id);
    if (!connection) {
      return res.status(404).json({ error: 'Jira not connected' });
    }

    const jiraApi = new JiraApiService(connection.access_token, connection.cloud_id, connection.site_url);
    const issueTypes = await jiraApi.getProjectIssueTypes(projectKey);

    res.json({ 
      issueTypes: issueTypes.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        subtask: t.subtask,
        hierarchyLevel: t.hierarchyLevel
      }))
    });
  } catch (error) {
    console.error('Jira issue types error:', error);
    res.status(500).json({ error: error.message || 'Failed to get issue types' });
  }
});

// Mark PRD as ready for execution
app.post('/api/prd/:id/mark-ready', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;
    const { jiraProjectKey, granularityMode } = req.body;

    // Update PRD status
    const { data, error } = await supabaseAdmin
      .from('prd_versions')
      .update({ 
        status: 'ready_for_execution',
        jira_project_key: jiraProjectKey || null,
        granularity_mode: granularityMode || 'rolled_up',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Mark PRD ready error:', error);
      return res.status(500).json({ error: 'Failed to update PRD status' });
    }

    res.json({ success: true, prd: data });
  } catch (error) {
    console.error('Mark PRD ready error:', error);
    res.status(500).json({ error: 'Failed to mark PRD ready' });
  }
});

// Get tickets for a PRD
app.get('/api/prd/:id/tickets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;

    // Verify PRD ownership
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (prdError || !prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Get tickets using the helper function
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .rpc('get_prd_tickets_with_hierarchy', { p_prd_version_id: id });

    if (ticketsError) {
      console.error('Get PRD tickets error:', ticketsError);
      return res.status(500).json({ error: 'Failed to get tickets' });
    }

    // Get progress stats
    const { data: progress, error: progressError } = await supabaseAdmin
      .rpc('get_prd_execution_progress', { p_prd_version_id: id });

    res.json({ 
      tickets: tickets || [],
      progress: progress?.[0] || null
    });
  } catch (error) {
    console.error('Get PRD tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// Update a draft ticket
app.patch('/api/prd/:prdId/tickets/:ticketId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { prdId, ticketId } = req.params;
    const { summary, description, acceptanceCriteria, priority } = req.body;

    // Verify ownership through PRD
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', prdId)
      .eq('user_id', user.id)
      .single();

    if (prdError || !prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Update ticket
    const updateData = { updated_at: new Date().toISOString() };
    if (summary !== undefined) updateData.draft_summary = summary;
    if (description !== undefined) updateData.draft_description = description;
    if (acceptanceCriteria !== undefined) updateData.draft_acceptance_criteria = acceptanceCriteria;
    if (priority !== undefined) updateData.draft_priority = priority;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('prd_jira_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .eq('prd_version_id', prdId)
      .select()
      .single();

    if (ticketError) {
      console.error('Update ticket error:', ticketError);
      return res.status(500).json({ error: 'Failed to update ticket' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Approve a ticket
app.post('/api/prd/:prdId/tickets/:ticketId/approve', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { prdId, ticketId } = req.params;

    // Verify ownership
    const { data: prd } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', prdId)
      .eq('user_id', user.id)
      .single();

    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('prd_jira_tickets')
      .update({ 
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .eq('prd_version_id', prdId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to approve ticket' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Approve ticket error:', error);
    res.status(500).json({ error: 'Failed to approve ticket' });
  }
});

// Reject a ticket
app.post('/api/prd/:prdId/tickets/:ticketId/reject', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { prdId, ticketId } = req.params;

    // Verify ownership
    const { data: prd } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', prdId)
      .eq('user_id', user.id)
      .single();

    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('prd_jira_tickets')
      .update({ 
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .eq('prd_version_id', prdId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to reject ticket' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Reject ticket error:', error);
    res.status(500).json({ error: 'Failed to reject ticket' });
  }
});

// Bulk approve all tickets
app.post('/api/prd/:id/tickets/approve-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: prd } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('prd_jira_tickets')
      .update({ 
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('prd_version_id', id)
      .eq('status', 'draft')
      .select();

    if (error) {
      return res.status(500).json({ error: 'Failed to approve tickets' });
    }

    res.json({ success: true, approvedCount: tickets?.length || 0 });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ error: 'Failed to approve tickets' });
  }
});

// Classify PRD size
app.post('/api/prd/:id/classify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;

    // Get PRD with sections
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('*, prd_sections(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (prdError || !prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Classify the PRD
    const classification = await ticketDraftingService.classifyPRD({
      title: prd.title,
      sections: prd.prd_sections
    });

    // Update PRD with classification
    await supabaseAdmin
      .from('prd_versions')
      .update({ 
        classification: classification.classification,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json(classification);
  } catch (error) {
    console.error('PRD classification error:', error);
    res.status(500).json({ error: error.message || 'Failed to classify PRD' });
  }
});

// Generate draft tickets from PRD
app.post('/api/prd/:id/draft-tickets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;
    const { granularityMode, classification: providedClassification } = req.body;

    // Get PRD with sections
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('*, prd_sections(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (prdError || !prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Get or determine classification
    let classification = providedClassification || prd.classification;
    let featureAreas = [];

    if (!classification) {
      const classificationResult = await ticketDraftingService.classifyPRD({
        title: prd.title,
        sections: prd.prd_sections
      });
      classification = classificationResult.classification;
      featureAreas = classificationResult.featureAreas;

      // Save classification
      await supabaseAdmin
        .from('prd_versions')
        .update({ 
          classification,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    // Generate tickets
    const { tickets, generationNotes } = await ticketDraftingService.generateTickets(
      { title: prd.title, sections: prd.prd_sections },
      { 
        granularityMode: granularityMode || prd.granularity_mode || 'rolled_up',
        classification,
        featureAreas
      }
    );

    // Save draft tickets
    const savedTickets = await ticketDraftingService.saveDraftTickets(id, tickets);

    res.json({ 
      success: true,
      tickets: savedTickets,
      classification,
      generationNotes
    });
  } catch (error) {
    console.error('Draft ticket generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate tickets' });
  }
});

// Publish approved tickets to Jira
app.post('/api/prd/:id/tickets/publish', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;

    // Get PRD
    const { data: prd, error: prdError } = await supabaseAdmin
      .from('prd_versions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (prdError || !prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    // Get Jira connection
    const connection = await jiraAuthService.getValidConnection(user.id);
    if (!connection) {
      return res.status(400).json({ error: 'Jira not connected' });
    }

    // Determine project key
    const projectKey = prd.jira_project_key || connection.default_project_key;
    if (!projectKey) {
      return res.status(400).json({ error: 'No Jira project selected' });
    }

    // Get approved tickets
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('prd_jira_tickets')
      .select('*')
      .eq('prd_version_id', id)
      .eq('status', 'approved')
      .order('sort_order');

    if (ticketsError || !tickets || tickets.length === 0) {
      return res.status(400).json({ error: 'No approved tickets to publish' });
    }

    const jiraApi = new JiraApiService(connection.access_token, connection.cloud_id, connection.site_url);
    
    // Determine available issue types
    const issueTypes = connection.available_issue_types || [];
    const hasEpic = issueTypes.some(t => t.name.toLowerCase() === 'epic');
    const storyType = issueTypes.find(t => t.name.toLowerCase() === 'story')?.name || 
                      issueTypes.find(t => t.name.toLowerCase() === 'task')?.name || 
                      'Task';

    const published = [];
    const errors = [];
    const idMapping = new Map(); // local ID -> Jira key

    // First pass: create epics
    for (const ticket of tickets) {
      if (ticket.issue_type === 'epic') {
        try {
          const issueType = hasEpic ? 'Epic' : storyType;
          const result = await jiraApi.createIssue({
            projectKey,
            issueType,
            summary: ticket.draft_summary,
            description: `${ticket.draft_description || ''}\n\n## Acceptance Criteria\n${ticket.draft_acceptance_criteria || ''}`,
            priority: ticket.draft_priority
          });

          // Update ticket with Jira details
          await supabaseAdmin
            .from('prd_jira_tickets')
            .update({
              jira_issue_key: result.key,
              jira_issue_id: result.id,
              status: 'published',
              published_at: new Date().toISOString(),
              jira_status: 'To Do',
              jira_status_category: 'todo',
              updated_at: new Date().toISOString()
            })
            .eq('id', ticket.id);

          idMapping.set(ticket.id, result.key);
          published.push({
            ticketId: ticket.id,
            jiraKey: result.key,
            jiraUrl: result.url
          });
        } catch (err) {
          console.error(`Failed to create epic ${ticket.draft_summary}:`, err);
          errors.push({
            ticketId: ticket.id,
            error: err.message
          });
        }
      }
    }

    // Second pass: create stories (with parent links if applicable)
    for (const ticket of tickets) {
      if (ticket.issue_type === 'story') {
        try {
          const parentKey = ticket.parent_ticket_id ? idMapping.get(ticket.parent_ticket_id) : null;
          
          const result = await jiraApi.createIssue({
            projectKey,
            issueType: storyType,
            summary: ticket.draft_summary,
            description: `${ticket.draft_description || ''}\n\n## Acceptance Criteria\n${ticket.draft_acceptance_criteria || ''}`,
            priority: ticket.draft_priority,
            parentKey: parentKey
          });

          // Update ticket with Jira details
          await supabaseAdmin
            .from('prd_jira_tickets')
            .update({
              jira_issue_key: result.key,
              jira_issue_id: result.id,
              status: 'published',
              published_at: new Date().toISOString(),
              jira_status: 'To Do',
              jira_status_category: 'todo',
              updated_at: new Date().toISOString()
            })
            .eq('id', ticket.id);

          idMapping.set(ticket.id, result.key);
          published.push({
            ticketId: ticket.id,
            jiraKey: result.key,
            jiraUrl: result.url
          });
        } catch (err) {
          console.error(`Failed to create story ${ticket.draft_summary}:`, err);
          errors.push({
            ticketId: ticket.id,
            error: err.message
          });
        }
      }
    }

    // Lock PRD after publishing
    if (published.length > 0) {
      await supabaseAdmin
        .from('prd_versions')
        .update({
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    res.json({
      success: errors.length === 0,
      published,
      errors
    });
  } catch (error) {
    console.error('Publish to Jira error:', error);
    res.status(500).json({ error: error.message || 'Failed to publish to Jira' });
  }
});

// Sync Jira status for PRD tickets
app.post('/api/prd/:id/sync-jira', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: prd } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    const result = await jiraSyncService.syncPRDTickets(id, user.id);
    res.json(result);
  } catch (error) {
    console.error('Jira sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync Jira status' });
  }
});

// Get drift logs for a PRD
app.get('/api/prd/:id/drift', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: prd } = await supabaseAdmin
      .from('prd_versions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!prd) {
      return res.status(404).json({ error: 'PRD not found' });
    }

    const logs = await driftDetectionService.getPendingDrift(id);
    res.json({ logs });
  } catch (error) {
    console.error('Get drift logs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get drift logs' });
  }
});

// Acknowledge drift
app.post('/api/prd/:id/drift/:logId/acknowledge', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { logId } = req.params;
    const result = await driftDetectionService.acknowledgeDrift(logId, user.id);
    res.json({ success: true, log: result });
  } catch (error) {
    console.error('Acknowledge drift error:', error);
    res.status(500).json({ error: error.message || 'Failed to acknowledge drift' });
  }
});

// Resolve drift
app.post('/api/prd/:id/drift/:logId/resolve', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    const { logId } = req.params;
    const { resolution } = req.body;
    
    const result = await driftDetectionService.resolveDrift(logId, user.id, resolution);
    res.json({ success: true, log: result });
  } catch (error) {
    console.error('Resolve drift error:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve drift' });
  }
});

// Manual Jira sync trigger
app.post('/api/jira/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
    }

    // Sync all tickets for this user
    await jiraSyncService.syncAllActiveTickets();
    res.json({ success: true, message: 'Sync triggered' });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger sync' });
  }
});

// Serve static files from the dist directory (AFTER all API routes)
app.use(express.static('dist'));

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
