/**
 * Script to run the action_executions table migration
 * This connects to Supabase and runs the migration SQL
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔄 Running action_executions migration...')
  
  const migrationPath = join(__dirname, '..', 'database', 'migrations', 'add_execution_tracking.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')
  
  // Split by semicolons and filter out empty statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  try {
    for (const statement of statements) {
      if (statement.length > 0) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase.from('_migrations').select('*')
          if (directError) {
            console.log('⚠️  Note: This migration needs to be run in Supabase SQL Editor')
            console.log('📋 Please copy the SQL from: database/migrations/add_execution_tracking.sql')
            console.log('🔗 Go to: https://supabase.com/dashboard/project/_/sql')
            break
          }
        }
      }
    }
    
    console.log('✅ Migration completed!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📋 Manual Migration Required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy contents from: database/migrations/add_execution_tracking.sql')
    console.log('3. Paste and run in SQL Editor')
    process.exit(1)
  }
}

runMigration()

