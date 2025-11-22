#!/bin/bash

# Simple script to view all server logs in one place
# Usage: ./view-logs.sh

echo "📊 Server Logs Viewer"
echo "===================="
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Show Python logs (most important for action execution)
echo "🐍 Python Backend Logs (Action Execution):"
echo "-------------------------------------------"
tail -f meeting-agent/backend/python-server.log 2>/dev/null || echo "⚠️  Python log file not found. Server may not be running."

