#!/usr/bin/env node

/**
 * Monitor sync progress and check for optimized chunks
 * 
 * Usage:
 *   node scripts/monitor-sync-progress.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
);

async function monitorSync() {
  console.log('🔄 Monitoring Sync Progress');
  console.log('='.repeat(60));
  console.log('Press Ctrl+C to stop\n');

  let lastCheck = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

  setInterval(async () => {
    try {
      // Get chunks created in last 5 minutes
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id, content, created_at, metadata')
        .gte('created_at', lastCheck.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (chunks && chunks.length > 0) {
        const sizes = chunks.map(c => c.content?.length || 0);
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const small = sizes.filter(s => s <= 600).length;
        const large = sizes.filter(s => s > 1000).length;

        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] New chunks: ${chunks.length}`);
        console.log(`  Average size: ${Math.round(avgSize)} chars`);
        console.log(`  Small (≤600): ${small} (${Math.round(small/sizes.length*100)}%)`);
        console.log(`  Large (>1000): ${large} (${Math.round(large/sizes.length*100)}%)`);
        
        if (avgSize <= 600 && large/sizes.length < 0.2) {
          console.log(`  ✅ OPTIMIZED CHUNKS DETECTED!`);
        } else {
          console.log(`  ⏳ Still using old chunking (restart server if needed)`);
        }
        console.log('');
      }

      // Update last check time
      lastCheck = new Date(Date.now() - 1 * 60 * 1000); // Check last minute next time

      // Check active syncs
      const { data: syncs } = await supabase
        .from('sync_metadata')
        .select('*')
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(5);

      if (syncs && syncs.length > 0) {
        syncs.forEach(s => {
          console.log(`  🔄 ${s.source_type} sync: ${s.files_processed || 0} files processed`);
        });
      }

    } catch (error) {
      console.error('Error:', error.message);
    }
  }, 10000); // Check every 10 seconds
}

monitorSync();

