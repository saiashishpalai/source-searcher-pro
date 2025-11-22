# Todoist Webhook Setup Guide

## 🔄 Bi-Directional Sync Overview

The webhook system is **event-driven** (not polling), meaning:
- ✅ **No API rate limits** - Todoist sends events only when tasks change
- ✅ **Real-time updates** - Changes appear instantly in your dashboard
- ✅ **No polling overhead** - No need to check every X minutes

## 📡 How Webhooks Work

1. **Task created** in your app → Created in Todoist ✅
2. **Task completed** in Todoist → Webhook fires → Dashboard updates ✅
3. **Task uncompleted** in Todoist → Webhook fires → Dashboard updates ✅
4. **Task deleted** in Todoist → Webhook fires → Dashboard updates ✅

**Frequency**: Events fire **immediately** when changes happen (not on a schedule)

## 🛠️ Setup Instructions

### Step 1: Get Your Webhook URL

**⚠️ IMPORTANT**: Todoist webhooks require a **PUBLIC HTTPS URL**. `localhost` won't work!

**For Local Development (use ngrok or similar):**
```bash
# Install ngrok: https://ngrok.com/download
# Start tunnel:
ngrok http 8000

# Use the HTTPS URL it provides, e.g.:
https://abc123.ngrok.io/api/v1/webhooks/todoist
```

**For Production:**
```
https://your-domain.com/api/v1/webhooks/todoist
```

### Step 2: Configure in Todoist

1. Go to [Todoist App Management](https://developer.todoist.com/appconsole.html)
2. Select your app
3. Go to **Webhooks** section
4. Add webhook URL:
   - **URL**: `http://localhost:8000/api/v1/webhooks/todoist` (or your production URL)
   - **Events**: Select:
     - ✅ `item:completed`
     - ✅ `item:uncompleted`
     - ✅ `item:updated`
     - ✅ `item:deleted`

### Step 3: Test the Webhook

1. Complete a task in Todoist that was created by the agent
2. Check your logs - you should see:
   ```
   🔔 Todoist webhook received
   📥 Event: item:completed, Task ID: ...
   ✅ Updated task ... to completed
   ```
3. Check your dashboard - the task should show as "completed"

## 🔍 Verifying Webhook Works

### Check Logs:
```bash
tail -f meeting-agent/backend/python-server.log | grep "Todoist webhook"
```

### Test Manually:
1. Complete a task in Todoist
2. Watch logs for webhook event
3. Refresh dashboard - status should update

## 📊 What Gets Updated

When a task is completed in Todoist:
- ✅ `action_items.status` → `"completed"`
- ✅ `action_executions.status` → `"completed"`
- ✅ UI updates automatically (via Supabase real-time subscriptions)
- ✅ Toast notification shows "Task Completed"

## ⚠️ Important Notes

1. **Webhooks are event-driven** - They fire when events happen, not on a schedule
2. **No polling needed** - Todoist sends events to your server
3. **Real-time updates** - Changes appear instantly via Supabase subscriptions
4. **Production requires HTTPS** - Todoist webhooks require HTTPS URLs

## 🚀 Production Setup

For production, you'll need:
1. HTTPS endpoint (Todoist requires HTTPS)
2. Public URL (not localhost)
3. Update webhook URL in Todoist app settings

Example production webhook URL:
```
https://your-backend.com/api/v1/webhooks/todoist
```

