#!/bin/bash

# Slack Integration Setup Script
# This script helps you configure your .env.local for Slack integration

set -e

echo "🎉 Slack Integration Setup"
echo "=========================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create one by copying env.example:"
    echo "  cp env.example .env.local"
    exit 1
fi

echo "Step 1: Updating Slack credentials..."

# Update Slack credentials
if grep -q "^SLACK_CLIENT_ID=" .env.local; then
    sed -i.bak 's/^SLACK_CLIENT_ID=.*/SLACK_CLIENT_ID=9686909204692.9680577385413/' .env.local
    echo "✅ Updated SLACK_CLIENT_ID"
else
    echo "SLACK_CLIENT_ID=9686909204692.9680577385413" >> .env.local
    echo "✅ Added SLACK_CLIENT_ID"
fi

if grep -q "^SLACK_CLIENT_SECRET=" .env.local; then
    sed -i.bak 's/^SLACK_CLIENT_SECRET=.*/SLACK_CLIENT_SECRET=843eda4877df61a3461a441cb13c58f8/' .env.local
    echo "✅ Updated SLACK_CLIENT_SECRET"
else
    echo "SLACK_CLIENT_SECRET=843eda4877df61a3461a441cb13c58f8" >> .env.local
    echo "✅ Added SLACK_CLIENT_SECRET"
fi

if grep -q "^VITE_SLACK_CLIENT_ID=" .env.local; then
    sed -i.bak 's/^VITE_SLACK_CLIENT_ID=.*/VITE_SLACK_CLIENT_ID=9686909204692.9680577385413/' .env.local
    echo "✅ Updated VITE_SLACK_CLIENT_ID"
else
    echo "VITE_SLACK_CLIENT_ID=9686909204692.9680577385413" >> .env.local
    echo "✅ Added VITE_SLACK_CLIENT_ID"
fi

# Add API_BASE_URL if not present
if ! grep -q "^API_BASE_URL=" .env.local; then
    echo "" >> .env.local
    echo "# API Base URL for OAuth callbacks" >> .env.local
    echo "API_BASE_URL=http://localhost:3000" >> .env.local
    echo "✅ Added API_BASE_URL"
fi

# Clean up backup files
rm -f .env.local.bak

echo ""
echo "✅ Slack credentials configured!"
echo ""
echo "=========================="
echo "🚀 Next Steps:"
echo "=========================="
echo ""
echo "1. Start ngrok tunnel:"
echo "   ./ngrok http 3000"
echo ""
echo "2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)"
echo ""
echo "3. Update your .env.local with ngrok URL:"
echo "   VITE_API_URL=https://abc123.ngrok.io"
echo "   API_BASE_URL=https://abc123.ngrok.io"
echo ""
echo "4. Update Slack App OAuth Redirect URLs:"
echo "   https://api.slack.com/apps/A09L0GZBBC5"
echo "   Add: https://abc123.ngrok.io/api/auth/slack/callback"
echo ""
echo "5. Restart your servers:"
echo "   npm run dev"
echo ""
echo "📚 For detailed instructions, see:"
echo "   docs/features/SLACK_INTEGRATION_GUIDE.md"
echo ""

