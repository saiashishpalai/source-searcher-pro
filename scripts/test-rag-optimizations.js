#!/usr/bin/env node

/**
 * Test script for RAG optimizations
 * 
 * Usage:
 *   node scripts/test-rag-optimizations.js
 * 
 * This script tests:
 * 1. RAG retrieval quality (chunk count, relevance scores)
 * 2. Chunking improvements (chunk sizes, sentence boundaries)
 * 3. PRD generation quality (citation count, empty sections)
 * 4. Token usage comparison
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { SearchService } from '../server/services/search-service.js';
import { PRDAssemblyService } from '../server/services/prd-assembly.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
);

const searchService = new SearchService(openaiApiKey);
const prdAssemblyService = new PRDAssemblyService(openaiApiKey);

// Test queries for different scenarios
const TEST_QUERIES = [
  {
    name: 'Specific Technical Query',
    query: 'What are the API endpoints for authentication?',
    expectedRelevance: 'high'
  },
  {
    name: 'General Search',
    query: 'project timeline and deadlines',
    expectedRelevance: 'medium'
  },
  {
    name: 'Definition Query',
    query: 'What is the architecture of the system?',
    expectedRelevance: 'high'
  },
  {
    name: 'List Query',
    query: 'List all features mentioned in the documents',
    expectedRelevance: 'medium'
  }
];

/**
 * Test RAG retrieval quality
 */
async function testRAGRetrieval() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING RAG RETRIEVAL OPTIMIZATIONS');
  console.log('='.repeat(60));

  // Find a user with documents
  const { data: documents } = await supabaseAdmin
    .from('documents')
    .select('user_id')
    .limit(1);

  if (!documents || documents.length === 0) {
    console.log('⚠️  No documents found. Please sync some documents first.');
    return;
  }

  const testUserId = documents[0].user_id;
  console.log(`\n📊 Testing with user: ${testUserId.substring(0, 8)}...`);

  // Check current configuration
  console.log('\n📋 Current Configuration:');
  console.log(`  RAG_MATCH_THRESHOLD: ${process.env.RAG_MATCH_THRESHOLD || '0.7 (default)'}`);
  console.log(`  RAG_MAX_CHUNKS: ${process.env.RAG_MAX_CHUNKS || '7 (default)'}`);
  console.log(`  RAG_RELEVANCE_THRESHOLD: ${process.env.RAG_RELEVANCE_THRESHOLD || '0.65 (default)'}`);

  // Check if user has documents
  const { data: userDocuments, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, title, source_type')
    .eq('user_id', testUserId)
    .limit(5);

  if (docError || !userDocuments || userDocuments.length === 0) {
    console.log('\n⚠️  No documents found for this user.');
    console.log('   Please sync some documents first (Google Drive, Notion, or Slack)');
    return;
  }

  console.log(`\n✅ Found ${userDocuments.length} documents to test with`);

  const results = [];

  for (const testCase of TEST_QUERIES) {
    console.log(`\n🔎 Testing: "${testCase.query}"`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const searchResult = await searchService.search(testUserId, testCase.query, supabaseAdmin);
      const searchTime = Date.now() - startTime;

      const resultCount = searchResult.results?.length || 0;
      const avgRelevance = searchResult.results?.length > 0
        ? searchResult.results.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / resultCount
        : 0;

      // Estimate token usage (rough calculation)
      const totalContentLength = searchResult.results?.reduce((sum, r) => 
        sum + (r.content?.length || 0), 0) || 0;
      const estimatedTokens = Math.ceil(totalContentLength / 4); // ~4 chars per token

      results.push({
        query: testCase.query,
        resultCount,
        avgRelevance: avgRelevance.toFixed(3),
        searchTime,
        estimatedTokens,
        hasSummary: !!searchResult.aiSummary
      });

      console.log(`  ✅ Results: ${resultCount}`);
      console.log(`  📊 Avg Relevance: ${avgRelevance.toFixed(3)}`);
      console.log(`  ⏱️  Search Time: ${searchTime}ms`);
      console.log(`  💰 Estimated Tokens: ~${estimatedTokens}`);
      console.log(`  📝 Has AI Summary: ${searchResult.aiSummary ? 'Yes' : 'No'}`);

      // Quality checks
      if (resultCount > 5) {
        console.log(`  ⚠️  WARNING: More than 5 results (expected ≤5 after optimization)`);
      }
      if (avgRelevance < 0.65) {
        console.log(`  ⚠️  WARNING: Low average relevance (expected ≥0.65)`);
      }
      if (estimatedTokens > 2000) {
        console.log(`  ⚠️  WARNING: High token usage (expected <2000)`);
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      results.push({
        query: testCase.query,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const successfulTests = results.filter(r => !r.error);
  if (successfulTests.length > 0) {
    const avgResultCount = successfulTests.reduce((sum, r) => sum + r.resultCount, 0) / successfulTests.length;
    const avgRelevance = successfulTests.reduce((sum, r) => sum + parseFloat(r.avgRelevance), 0) / successfulTests.length;
    const avgTokens = successfulTests.reduce((sum, r) => sum + r.estimatedTokens, 0) / successfulTests.length;
    const avgTime = successfulTests.reduce((sum, r) => sum + r.searchTime, 0) / successfulTests.length;

    console.log(`\n✅ Successful Tests: ${successfulTests.length}/${results.length}`);
    console.log(`\n📈 Average Metrics:`);
    console.log(`   Results per query: ${avgResultCount.toFixed(1)} (target: ≤5)`);
    console.log(`   Avg relevance score: ${avgRelevance.toFixed(3)} (target: ≥0.65)`);
    console.log(`   Estimated tokens: ~${Math.round(avgTokens)} (target: <2000)`);
    console.log(`   Search time: ${Math.round(avgTime)}ms`);

    // Optimization checks
    console.log(`\n✅ Optimization Checks:`);
    console.log(`   ${avgResultCount <= 5 ? '✅' : '❌'} Result count ≤ 5`);
    console.log(`   ${avgRelevance >= 0.65 ? '✅' : '❌'} Relevance ≥ 0.65`);
    console.log(`   ${avgTokens < 2000 ? '✅' : '❌'} Token usage < 2000`);
  }
}

/**
 * Test chunking improvements
 */
async function testChunking() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 TESTING CHUNKING OPTIMIZATIONS');
  console.log('='.repeat(60));

  // Find a user with chunks
  const { data: chunkUsers } = await supabaseAdmin
    .from('document_chunks')
    .select('user_id')
    .limit(1);

  if (!chunkUsers || chunkUsers.length === 0) {
    console.log('⚠️  No chunks found. Please sync documents first.');
    return;
  }

  const testUserId = chunkUsers[0].user_id;

  // Get chunk statistics
  const { data: chunks, error } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content, metadata, token_count')
    .eq('user_id', testUserId)
    .limit(100);

  if (error || !chunks || chunks.length === 0) {
    console.log('⚠️  No chunks found. Please sync documents first.');
    return;
  }

  console.log(`\n📊 Analyzing ${chunks.length} chunks...`);

  const chunkSizes = chunks.map(c => c.content?.length || 0);
  const avgChunkSize = chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length;
  const maxChunkSize = Math.max(...chunkSizes);
  const minChunkSize = Math.min(...chunkSizes);

  // Count chunks by size ranges
  const smallChunks = chunkSizes.filter(s => s <= 600).length;
  const mediumChunks = chunkSizes.filter(s => s > 600 && s <= 1000).length;
  const largeChunks = chunkSizes.filter(s => s > 1000).length;

  console.log(`\n📏 Chunk Size Statistics:`);
  console.log(`   Average: ${Math.round(avgChunkSize)} chars`);
  console.log(`   Min: ${minChunkSize} chars`);
  console.log(`   Max: ${maxChunkSize} chars`);
  console.log(`\n📊 Size Distribution:`);
  console.log(`   Small (≤600): ${smallChunks} (${(smallChunks/chunks.length*100).toFixed(1)}%)`);
  console.log(`   Medium (601-1000): ${mediumChunks} (${(mediumChunks/chunks.length*100).toFixed(1)}%)`);
  console.log(`   Large (>1000): ${largeChunks} (${(largeChunks/chunks.length*100).toFixed(1)}%)`);

  // Check sentence boundaries (sample check)
  const sampleChunks = chunks.slice(0, 10);
  let sentenceBoundaryCount = 0;
  sampleChunks.forEach(chunk => {
    const content = chunk.content || '';
    // Check if chunk ends with sentence punctuation
    if (/[.!?]\s*$/.test(content.trim())) {
      sentenceBoundaryCount++;
    }
  });

  console.log(`\n✅ Optimization Checks:`);
  console.log(`   ${avgChunkSize <= 600 ? '✅' : '❌'} Average chunk size ≤ 600 chars`);
  console.log(`   ${largeChunks / chunks.length < 0.2 ? '✅' : '❌'} <20% large chunks (>1000 chars)`);
  console.log(`   ${sentenceBoundaryCount / sampleChunks.length >= 0.7 ? '✅' : '⚠️ '} Sentence boundaries preserved (${(sentenceBoundaryCount/sampleChunks.length*100).toFixed(0)}%)`);
}

/**
 * Test PRD generation
 */
async function testPRDGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log('📄 TESTING PRD GENERATION OPTIMIZATIONS');
  console.log('='.repeat(60));

  // Find a user with chunks
  const { data: prdChunkUsers } = await supabaseAdmin
    .from('document_chunks')
    .select('user_id')
    .limit(1);

  if (!prdChunkUsers || prdChunkUsers.length === 0) {
    console.log('⚠️  No chunks found. Please sync documents first.');
    return;
  }

  const testUserId = prdChunkUsers[0].user_id;

  // Get some citations for testing
  const { data: chunks } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content')
    .eq('user_id', testUserId)
    .limit(10);

  if (!chunks || chunks.length === 0) {
    console.log('⚠️  No chunks found. Please sync documents first.');
    return;
  }

  console.log(`\n📋 Current Configuration:`);
  console.log(`   PRD_MAX_CITATIONS: ${process.env.PRD_MAX_CITATIONS || '5 (default)'}`);

  // Test PRD generation with sample sections
  const testSections = {
    objective: 'Build a new feature for user authentication',
    background: 'Users need secure login functionality',
    scope: 'Implement OAuth 2.0 authentication',
    requirements: 'Support Google and GitHub OAuth',
    metrics: '100% authentication success rate',
    timeline: '2 weeks'
  };

  const citationIds = chunks.slice(0, 10).map(c => c.id);
  const citationContents = await prdAssemblyService.fetchCitationContents(
    citationIds,
    supabaseAdmin,
    testUserId
  );

  console.log(`\n📊 Citation Statistics:`);
  console.log(`   Requested: ${citationIds.length}`);
  console.log(`   Retrieved: ${citationContents.length}`);
  console.log(`   ${citationContents.length <= 5 ? '✅' : '❌'} Citations ≤ 5 (optimized)`);

  // Estimate token usage
  const citationTokens = citationContents.reduce((sum, c) => sum + Math.ceil(c.length / 4), 0);
  console.log(`   Estimated citation tokens: ~${citationTokens}`);

  console.log(`\n✅ PRD Optimization Checks:`);
  console.log(`   ${citationContents.length <= 5 ? '✅' : '❌'} Citation limit enforced (≤5)`);
  console.log(`   ${citationTokens < 2000 ? '✅' : '⚠️ '} Citation tokens < 2000`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 RAG OPTIMIZATION TEST SUITE');
  console.log('='.repeat(60));
  console.log(`\nEnvironment:`);
  console.log(`   Supabase URL: ${supabaseUrl ? '✅' : '❌'}`);
  console.log(`   OpenAI API Key: ${openaiApiKey ? '✅' : '❌'}`);

  try {
    await testRAGRetrieval();
    await testChunking();
    await testPRDGeneration();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(60));
    console.log('\n💡 Tips:');
    console.log('   - Compare results before/after optimization');
    console.log('   - Monitor OpenAI API usage dashboard');
    console.log('   - Check search quality in production');
    console.log('   - Adjust thresholds via environment variables if needed\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

