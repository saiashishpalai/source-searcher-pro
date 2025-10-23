# API Reference

This document provides a complete reference for the Haven7 backend API.

## 🌐 Base URL

**Production**: `https://source-searcher-pro.onrender.com`
**Development**: `http://localhost:3000`

## 🔐 Authentication

All API endpoints require authentication via Supabase JWT tokens sent in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

## 📋 Endpoints

### Health & Debug

#### `GET /api/health`
Check backend health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T22:52:36.091Z"
}
```

#### `GET /api/debug/env`
Check environment variables status.

**Response:**
```json
{
  "google_client_id": "✅ Found",
  "google_client_secret": "✅ Found",
  "slack_client_id": "✅ Found",
  "slack_client_secret": "✅ Found",
  "notion_client_id": "✅ Found",
  "notion_client_secret": "✅ Found",
  "supabase_url": "✅ Found",
  "supabase_service_key": "✅ Found"
}
```

#### `GET /api/debug/db-test`
Test database connection and schema.

**Response:**
```json
{
  "status": "success",
  "data": [...],
  "message": "Database save test passed"
}
```

### OAuth Authentication

#### `GET /api/auth/google`
Initiate Google Drive OAuth flow.

**Query Parameters:**
- `userId` (string, required): User ID from Supabase

**Response:** Redirects to Google OAuth page

#### `GET /api/auth/google/callback`
Handle Google Drive OAuth callback.

**Query Parameters:**
- `code` (string, required): Authorization code from Google
- `state` (string, required): State parameter with user ID

**Response:** Redirects to frontend with success/error

#### `GET /api/auth/slack`
Initiate Slack OAuth flow.

**Query Parameters:**
- `userId` (string, required): User ID from Supabase

**Response:** Redirects to Slack OAuth page

#### `GET /api/auth/slack/callback`
Handle Slack OAuth callback.

**Query Parameters:**
- `code` (string, required): Authorization code from Slack
- `state` (string, required): State parameter with user ID

**Response:** Redirects to frontend with success/error

#### `GET /api/auth/notion`
Initiate Notion OAuth flow.

**Query Parameters:**
- `userId` (string, required): User ID from Supabase

**Response:** Redirects to Notion OAuth page

#### `GET /api/auth/notion/callback`
Handle Notion OAuth callback.

**Query Parameters:**
- `code` (string, required): Authorization code from Notion
- `state` (string, required): State parameter with user ID

**Response:** Redirects to frontend with success/error

### User Connections

#### `GET /api/connections`
Get user's OAuth connections.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "source_type": "google_drive",
      "access_token": "encrypted-token",
      "refresh_token": "encrypted-token",
      "is_active": true,
      "created_at": "2025-10-23T22:52:36.091Z",
      "updated_at": "2025-10-23T22:52:36.091Z"
    }
  ]
}
```

#### `POST /api/connections/disconnect`
Disconnect a user's OAuth connection.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "sourceType": "google_drive"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection disconnected successfully"
}
```

### Content Sync

#### `GET /api/sync/status`
Get sync status for all connected sources.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "google_drive": {
    "last_sync": "2025-10-23T22:52:36.091Z",
    "status": "completed",
    "files_synced": 150
  },
  "slack": {
    "last_sync": "2025-10-23T22:52:36.091Z",
    "status": "completed",
    "messages_synced": 500
  },
  "notion": {
    "last_sync": "2025-10-23T22:52:36.091Z",
    "status": "completed",
    "pages_synced": 75
  }
}
```

#### `POST /api/sync/google_drive`
Trigger Google Drive sync.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Google Drive sync initiated",
  "sync_id": "uuid"
}
```

#### `POST /api/sync/slack`
Trigger Slack sync.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Slack sync initiated",
  "sync_id": "uuid"
}
```

#### `POST /api/sync/notion`
Trigger Notion sync.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Notion sync initiated",
  "sync_id": "uuid"
}
```

### Search

#### `POST /api/search`
Perform semantic search across all connected sources.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "query": "project deadline",
  "sources": ["google_drive", "slack", "notion"],
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Project Timeline",
      "content": "The project deadline is next Friday...",
      "source": "google_drive",
      "source_type": "document",
      "url": "https://drive.google.com/file/...",
      "relevance_score": 0.95,
      "created_at": "2025-10-23T22:52:36.091Z"
    }
  ],
  "total_results": 1,
  "query_time": 150
}
```

### Data Management

#### `POST /api/clear-data`
Clear synced data for a specific source.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "sourceType": "google_drive"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google Drive data cleared successfully"
}
```

## 🔄 OAuth Flow Examples

### Google Drive Connection

1. **Initiate OAuth:**
   ```
   GET /api/auth/google?userId=user-uuid
   ```

2. **User authorizes on Google**

3. **Google redirects to callback:**
   ```
   GET /api/auth/google/callback?code=auth-code&state=state:user-uuid
   ```

4. **Backend processes and redirects:**
   ```
   GET /frontend-url/connect-sources?success=true
   ```

### Slack Connection

1. **Initiate OAuth:**
   ```
   GET /api/auth/slack?userId=user-uuid
   ```

2. **User authorizes on Slack**

3. **Slack redirects to callback:**
   ```
   GET /api/auth/slack/callback?code=auth-code&state=state:user-uuid
   ```

4. **Backend processes and redirects:**
   ```
   GET /frontend-url/connect-sources?success=true
   ```

## 📊 Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Common Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### OAuth Error Codes

- `missing_params` - Missing required OAuth parameters
- `invalid_state` - Invalid state parameter
- `no_credentials` - OAuth credentials not configured
- `token_failed` - Token exchange failed
- `db_failed` - Database save failed

## 🔧 Rate Limiting

- **Search API**: 100 requests per minute per user
- **Sync API**: 10 requests per minute per user
- **OAuth API**: 20 requests per minute per user

## 📈 Response Times

- **Health Check**: < 100ms
- **OAuth Redirects**: < 200ms
- **Search Queries**: 1-5 seconds
- **Sync Operations**: 10-60 seconds

## 🛠️ Development

### Local Development

```bash
# Start backend server
npm run server

# Backend will be available at
http://localhost:3000
```

### Testing

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test environment variables
curl http://localhost:3000/api/debug/env
```

## 📚 Additional Resources

- [OAuth Setup Guide](../authentication/SUPABASE_AUTH_SETUP_GUIDE.md)
- [Database Schema](../database/DATABASE_SCHEMA.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
