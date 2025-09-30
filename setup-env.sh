#!/bin/bash

# Create .env.local file with Supabase credentials
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wjqlqmepnpvaywfbfpxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWxxbWVwbnB2YXl3ZmJmcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzMzNTcsImV4cCI6MjA3NDgwOTM1N30.pwRxkIQvPKVQxKEtjBLzS1TfyPZfo0g7lXwKZGAVIOM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWxxbWVwbnB2YXl3ZmJmcHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzMzM1NywiZXhwIjoyMDc0ODA5MzU3fQ.f87M1nU2TU1J2e-sxM9agH0DYd3bD8CTJBA0V3VvhMc

# JWT Secret (for additional security)
JWT_SECRET=haven7_jwt_secret_key_2024
EOF

echo "✅ Environment variables configured!"
echo "🚀 Starting development server..."

# Start the development server
npm run dev
