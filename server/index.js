import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:8080';

app.use(cors({ 
  origin: APP_URL,
  credentials: true 
}));
app.use(express.json());

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

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
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
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
        redirect_uri: `${APP_URL}/api/auth/slack/callback`,
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
        redirect_uri: `${APP_URL}/api/auth/notion/callback`,
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

app.listen(PORT, () => {
  console.log(`✓ API server running on http://localhost:${PORT}`);
});
