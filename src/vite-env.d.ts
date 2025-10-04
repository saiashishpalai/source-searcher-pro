/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_TOKEN_ENCRYPTION_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_CLIENT_SECRET: string
  readonly VITE_GOOGLE_REDIRECT_URI: string
  readonly VITE_SLACK_CLIENT_ID: string
  readonly VITE_SLACK_CLIENT_SECRET: string
  readonly VITE_SLACK_REDIRECT_URI: string
  readonly VITE_NOTION_CLIENT_ID: string
  readonly VITE_NOTION_CLIENT_SECRET: string
  readonly VITE_NOTION_REDIRECT_URI: string
  readonly VITE_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
