import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wjqlqmepnpvaywfbfpxb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const JWT = fs.readFileSync('tools/evals/out/jwt.txt', 'utf-8').trim();

const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: 'Bearer ' + JWT } },
  auth: { persistSession: false }
});

const docs = JSON.parse(fs.readFileSync('tools/evals/out/docs.json', 'utf-8'));
const out = [];

for (const d of docs.slice(0, 25)) {
  const { data: chunks } = await c
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('document_id', d.id)
    .order('chunk_index', { ascending: true })
    .limit(200);

  const expected = (chunks || []).map(x => String(x.id));
  const q = (chunks && chunks[0]?.content || d.snippet || d.title || '').slice(0, 200).replace(/\s+/g, ' ').trim() || ('find ' + d.id);
  out.push({ query: q, expectedDocIds: expected.length ? expected : [String(d.id)] });
}

fs.writeFileSync('tools/evals/out/testcases.json', JSON.stringify(out, null, 2));
console.log('Wrote', out.length, 'chunk-based testcases to tools/evals/out/testcases.json');
