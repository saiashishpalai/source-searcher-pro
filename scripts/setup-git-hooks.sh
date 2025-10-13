#!/bin/bash

# Setup Git Hooks for Secret Detection
# This script installs a pre-commit hook to prevent committing secrets

echo "🔒 Setting up Git hooks for secret detection..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Scanning for potential secrets..."

# Define patterns to detect secrets
PATTERNS=(
    "sk-[a-zA-Z0-9]{20,}"                    # OpenAI API keys
    "xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}"  # Slack bot tokens
    "xoxp-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}"  # Slack user tokens
    "secret_[a-zA-Z0-9]{20,}"                # Notion secrets
    "[0-9]{32,}"                             # Generic long numbers (potential secrets)
    "(SLACK_CLIENT_SECRET|NOTION_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|OPENAI_API_KEY)=[^y<][a-zA-Z0-9-_]{20,}"
)

# Check staged files for secrets
FOUND_SECRET=0

for pattern in "${PATTERNS[@]}"; do
    if git diff --cached | grep -E "$pattern" | grep -v "your-.*-here" | grep -v "<paste-" > /dev/null; then
        echo "❌ ERROR: Potential secret detected matching pattern: $pattern"
        FOUND_SECRET=1
    fi
done

if [ $FOUND_SECRET -eq 1 ]; then
    echo ""
    echo "🚨 COMMIT BLOCKED: Potential secrets detected!"
    echo ""
    echo "Please review your changes and ensure:"
    echo "  1. No API keys or secrets are being committed"
    echo "  2. Use placeholder values like 'your-key-here' or '<paste-key>'"
    echo "  3. Store real credentials in .env.local (which is gitignored)"
    echo ""
    echo "To bypass this check (NOT recommended):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
fi

echo "✅ No secrets detected. Commit proceeding..."
exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "The hook will now scan for secrets before each commit."
echo "To test it, try committing a file with a fake API key."
echo ""

