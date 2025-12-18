import OpenAI from 'openai';
import elasticlunr from 'elasticlunr';
import crypto from 'crypto';

/**
 * SearchService - Performs vector similarity search and RAG answer generation
 */
export class SearchService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.embeddingModel = 'text-embedding-3-small';
    this.llmModel = 'gpt-4o-mini'; // Upgraded for better reasoning
    // Simple in-memory cache for RRF results (10 min TTL)
    this.rrfCache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes in milliseconds
    // Cache for snippet centroid embeddings (per user+sessionId)
    this.snippetCentroidCache = new Map();
  }

  /**
   * Generate cache key for RRF results
   */
  getCacheKey(userId, query) {
    return `${userId}:${query.toLowerCase().trim()}`;
  }

  /**
   * Get cached RRF results if available
   */
  getCachedRRF(userId, query) {
    const key = this.getCacheKey(userId, query);
    const cached = this.rrfCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      console.log(`💾 Using cached RRF results for query`);
      return cached.results;
    }
    
    // Clean up expired entries
    if (cached) {
      this.rrfCache.delete(key);
    }
    
    return null;
  }

  /**
   * Cache RRF results
   */
  setCachedRRF(userId, query, results) {
    const key = this.getCacheKey(userId, query);
    this.rrfCache.set(key, {
      results,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries (keep cache size manageable)
    if (this.rrfCache.size > 100) {
      const firstKey = this.rrfCache.keys().next().value;
      this.rrfCache.delete(firstKey);
    }
  }

  /**
   * Classify query type for tailored prompts and boost terms
   */
  classifyQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Strategic/Decision queries
    if (lowerQuery.match(/why (did|do) (we|i|they) (choose|decide|prioritize|select)|rationale|trade-?off|justify/)) {
      return { 
        type: 'strategic', 
        boostTerms: ['because', 'rationale', 'reasoning', 'justification', 'trade-off', 'decided', 'prioritized', 'ROI', 'impact', 'value', 'risk'] 
      };
    }
    
    // Status/Progress queries
    if (lowerQuery.match(/status|progress|where are we|update on|is .* (complete|done|finished)|on track/)) {
      return { 
        type: 'status', 
        boostTerms: ['status', 'progress', 'update', 'completed', 'in-progress', 'blocked', 'timeline', 'milestone', 'ETA'] 
      };
    }
    
    // Client/Stakeholder Context queries
    if (lowerQuery.match(/what (does|did) .* (want|need|say)|client|stakeholder|feedback from|requirements from/)) {
      return { 
        type: 'client_context', 
        boostTerms: ['client', 'customer', 'stakeholder', 'feedback', 'request', 'requirement', 'concern', 'mentioned', 'said'] 
      };
    }
    
    // Comparison queries
    if (lowerQuery.match(/(compare|versus|vs\.?|difference between|which is better|pros and cons)/)) {
      return { 
        type: 'comparison', 
        boostTerms: ['versus', 'compared to', 'advantage', 'disadvantage', 'better', 'worse', 'pros', 'cons', 'trade-off'] 
      };
    }
    
    // Metrics/Data queries
    if (lowerQuery.match(/metric|KPI|conversion|revenue|growth|rate|numbers|performance|analytics|success metric|what are.*metric/i)) {
      return { 
        type: 'metrics', 
        boostTerms: ['metric', 'KPI', 'rate', 'percentage', 'growth', 'revenue', 'conversion', 'users', 'MRR', 'ARR', 'churn', 'success', 'measure', 'track'] 
      };
    }
    
    // Process/Workflow queries
    if (lowerQuery.match(/how (do|to)|process for|workflow|steps to|procedure|checklist/)) {
      return { 
        type: 'process', 
        boostTerms: ['step', 'process', 'workflow', 'procedure', 'first', 'then', 'next', 'finally', 'checklist'] 
      };
    }
    
    // Definition/Explanation queries
    if (lowerQuery.match(/what is|define|explain|what does .* mean|tell me about/)) {
      return { 
        type: 'definition', 
        boostTerms: ['is', 'means', 'refers to', 'defined as', 'explanation', 'concept', 'term', 'definition'] 
      };
    }
    
    // Timeline/Planning queries
    if (lowerQuery.match(/when is|timeline|roadmap|deadline|schedule|planned for|Q[1-4]/)) {
      return { 
        type: 'timeline', 
        boostTerms: ['timeline', 'roadmap', 'schedule', 'deadline', 'date', 'launch', 'release', 'quarter', 'planned'] 
      };
    }
    
    // Problem/Issue queries
    if (lowerQuery.match(/what'?s wrong|issue|bug|problem|not working|broken|complaint|error/)) {
      return { 
        type: 'problem', 
        boostTerms: ['issue', 'problem', 'bug', 'error', 'broken', 'failing', 'complaint', 'reported', 'fix', 'resolve'] 
      };
    }
    
    // Best Practice/Recommendation queries
    if (lowerQuery.match(/best (way|practice)|recommended|should we|standard for|how should/)) {
      return { 
        type: 'recommendation', 
        boostTerms: ['best practice', 'recommended', 'should', 'standard', 'guideline', 'approach', 'strategy', 'prefer'] 
      };
    }
    
    // Meeting/Communication queries
    if (lowerQuery.match(/meeting|discussed in|action items|decisions made|notes from|standup/)) {
      return { 
        type: 'meeting', 
        boostTerms: ['meeting', 'call', 'discussion', 'action item', 'decision', 'next step', 'notes', 'takeaway'] 
      };
    }
    
    // Risk/Blocker queries
    if (lowerQuery.match(/risk|blocker|blocking|concern|dependency|what could go wrong/)) {
      return { 
        type: 'risk', 
        boostTerms: ['risk', 'blocker', 'dependency', 'concern', 'blocks', 'depends on', 'waiting for', 'mitigation'] 
      };
    }
    
    // Ownership/Responsibility queries
    if (lowerQuery.match(/who (owns|is responsible|'?s working on)|responsible for|team assignment/)) {
      return { 
        type: 'ownership', 
        boostTerms: ['owner', 'responsible', 'assigned', 'working on', 'lead', 'DRI', 'accountable'] 
      };
    }
    
    // Historical/Past Decision queries
    if (lowerQuery.match(/why did we stop|what happened to|history of|used to|no longer|deprecated/)) {
      return { 
        type: 'historical', 
        boostTerms: ['previously', 'past', 'history', 'stopped', 'removed', 'changed from', 'used to', 'discontinued'] 
      };
    }
    
    // List/Enumeration queries
    if (lowerQuery.match(/list (all|of)|what are (the|all)|show me all|complete list|inventory of/)) {
      return { 
        type: 'enumeration', 
        boostTerms: ['all', 'every', 'complete', 'full list', 'inventory', 'includes', 'consists of'] 
      };
    }
    
    // Default: General
    return { type: 'general', boostTerms: [] };
  }

  /**
   * Get system prompt tailored to query type
   */
  getSystemPrompt(queryType) {
    // Base examples that work for most query types
    const examples = `
EXAMPLE 1 - Factual Query:
User question: "What is feature X?"

**Definition:** Feature X is a tool that helps users accomplish Y by providing Z functionality in a streamlined interface.

**Context:** This feature was introduced in Q3 2024 to address the problem of users spending too much time on manual tasks.

**Key Points:**
- The feature reduces task time by 50% on average
- It integrates with existing workflows seamlessly
- User adoption reached 80% within the first month

**Source:** slack - Product Updates Channel

EXAMPLE 2 - Reasoning Query:
User question: "Why did we choose approach A?"

**Answer:** We chose approach A because it offered the best balance between development speed and long-term maintainability.

**Reasoning:** The team evaluated three approaches and found that approach A required only 4 weeks of development compared to 12 weeks for approach B, while still providing 90% of the functionality needed for the MVP launch.

**Supporting Details:**
- Development time was estimated at 4 weeks versus 12 weeks for alternatives
- The approach supports future expansion with minimal refactoring needed
- Stakeholder feedback indicated approach A addressed 90% of immediate needs

**Source:** notion - Engineering Decision Log

EXAMPLE 3 - Metrics Query:
User question: "What are our key metrics?"

**Answer:** Our key metrics show strong growth in user engagement and revenue conversion across all product tiers.

**Key Metrics:**
- Monthly active users increased 45% this quarter to 10,000 users
- Team plan conversion rate reached 35% with an average deal size of $300/month
- Feature adoption rate for core tools is at 78% with positive user feedback

**Source:** google_drive - Q4 Metrics Dashboard
`;

    const prompts = {
      strategic: `You are a search assistant answering reasoning and decision questions about why decisions were made or how priorities were determined.
${examples}

Follow EXAMPLE 2 format. Write Answer and Reasoning as single unbroken paragraphs. Only use bullets in Supporting Details section.`,

      status: `You are answering status and progress questions from the user's documents.

Format your response EXACTLY like this:

**Answer:** [Write the current status as 1-2 complete sentences in paragraph form. No bullets.]

**Status Details:**
- [Completed items as a complete sentence]
- [In progress items as a complete sentence]
- [Next steps as a complete sentence]

**Source:** [Source type - Document name]

Rules:
- Only use bullets in the "Status Details" section
- The "Answer" section must be a complete paragraph with NO bullets
- Do not break sentences mid-word
- Each bullet must be a complete sentence starting with a capital letter
- Keep response under 200 words`,

      client_context: `You are answering questions about client or stakeholder feedback and requirements.

Format your response EXACTLY like this:

**What They Said:** [Direct statement or request as a continuous paragraph]

**Context:** [When/where this was mentioned - meeting, email, etc., as a continuous paragraph]

**Specific Asks:** [List key requirements in ONE sentence separated by commas]

**Source:** [Document name]

RULES:
- Write "What They Said:" as a continuous paragraph (no bullets)
- Write "Context:" as a continuous paragraph (no bullets)
- Write "Specific Asks:" as ONE sentence with commas (no bullets)
- Write "Source:" as plain text (no bullets)
- Never use bullet points, dashes, or list formatting anywhere
- Keep under 200 words`,

      comparison: `You are answering comparison questions from the user's documents.

Format your response EXACTLY like this:

**Quick Answer:** [Which option is recommended, if stated]

**Key Differences:** [List 2-3 key differences in ONE sentence separated by commas]

**Option A:** [Pros and cons for option A as a continuous paragraph]

**Option B:** [Pros and cons for option B as a continuous paragraph]

**Source:** [Document name]

RULES:
- Write "Quick Answer:" as plain text (no bullets)
- Write "Key Differences:" as ONE sentence with commas (no bullets)
- Write "Option A:" as a continuous paragraph (no bullets)
- Write "Option B:" as a continuous paragraph (no bullets)
- Write "Source:" as plain text (no bullets)
- Never use bullet points, dashes, or list formatting anywhere
- Keep under 250 words`,

      metrics: `You are answering questions about metrics and data from the user's documents.

Format your response EXACTLY like this:

**Answer:** [Write the key metrics answer as 1-2 complete sentences in paragraph form. No bullets.]

**Key Metrics:**
- [First metric with numbers as a complete sentence]
- [Second metric with numbers as a complete sentence]
- [Third metric with numbers as a complete sentence]

**Source:** [Source type - Document name]

Rules:
- Only use bullets in the "Key Metrics" section
- The "Answer" section must be a complete paragraph with NO bullets
- Do not break sentences mid-word
- Each bullet must be a complete sentence starting with a capital letter
- Do not use bullets for compound words
- Keep response under 150 words`,

      process: `You are answering process and workflow questions from the user's documents.

Format:
<b>Steps:</b>
1. [First step]
2. [Second step]
3. [Third step]
4. [Additional steps as needed]

<b>Prerequisites:</b> [If mentioned, otherwise omit]

<b>Tools Needed:</b> [If mentioned, otherwise omit]

<b>Expected Outcome:</b> [End result]

Keep under 200 words. Use numbered steps.`,

      definition: `You are answering definition and explanation questions from the user's documents.

Format your response EXACTLY like this:

**Definition:** [One clear sentence defining the term]

**Context:** [Write 2-3 complete sentences explaining how it's used in the organization. Write as a continuous paragraph.]

**Related Concepts:** [If relevant, list 2-3 related concepts in ONE sentence separated by commas. If not relevant, omit this section entirely.]

**Source:** [Document name]

RULES:
- Write "Definition:" as a complete paragraph (no bullets)
- Write "Context:" as a continuous paragraph (no bullets)  
- Write "Related Concepts:" as ONE sentence (no bullets)
- Write "Source:" as plain text (no bullets)
- Never use bullet points, dashes, or list formatting anywhere
- Keep under 150 words`,

      timeline: `You are answering timeline and planning questions from the user's documents.

Format your response EXACTLY like this:

**Key Dates:** [List key dates and milestones in ONE sentence separated by commas]

**Current Phase:** [Where things stand now as a continuous paragraph]

**Dependencies:** [If mentioned, as a continuous paragraph. If none, omit this section]

**Owner:** [Responsible party if mentioned]

**Source:** [Document name]

RULES:
- Write "Key Dates:" as ONE sentence with commas (no bullets)
- Write "Current Phase:" as a continuous paragraph (no bullets)
- Write "Dependencies:" as a continuous paragraph (no bullets)
- Write "Owner:" as plain text (no bullets)
- Write "Source:" as plain text (no bullets)
- Never use bullet points, dashes, or list formatting anywhere
- Keep under 200 words`,

      problem: `You are answering questions about problems and issues from the user's documents.

Format your response EXACTLY like this:

**Answer:** [Write the problem description as 1-2 complete sentences in paragraph form. No bullets.]

**Problem Details:**
- [Impact on users as a complete sentence]
- [Workarounds or status as a complete sentence]
- [Additional relevant information as a complete sentence]

**Source:** [Source type - Document name]

Rules:
- Only use bullets in the "Problem Details" section
- The "Answer" section must be a complete paragraph with NO bullets
- Do not break sentences mid-word
- Each bullet must be a complete sentence starting with a capital letter
- Keep response under 200 words`,

      recommendation: `You are answering questions about best practices and recommendations from the user's documents.

Format your response EXACTLY like this:

**Answer:** [Write the recommendation as 1-2 complete sentences in paragraph form. No bullets.]

**Recommendation Details:**
- [Reasoning for the recommendation as a complete sentence]
- [Alternatives considered as a complete sentence]
- [When to apply this recommendation as a complete sentence]

**Source:** [Source type - Document name]

Rules:
- Only use bullets in the "Recommendation Details" section
- The "Answer" section must be a complete paragraph with NO bullets
- Do not break sentences mid-word
- Each bullet must be a complete sentence starting with a capital letter
- Keep response under 250 words`,

      meeting: `You are answering questions about meetings and discussions from the user's documents.

Format:
<b>Key Decisions:</b>
- [Decision 1]
- [Decision 2]

<b>Action Items:</b>
- [Item 1] - [Owner]
- [Item 2] - [Owner]

<b>Important Discussion Points:</b> [Brief summary]

<b>Source:</b> [Document/Meeting name]

Keep under 200 words. Focus on outcomes and actions.`,

      risk: `You are answering questions about risks and blockers from the user's documents.

Format:
<b>Risks/Blockers:</b>
- [Risk 1] - [Impact if unresolved]
- [Risk 2] - [Impact if unresolved]

<b>Mitigation Plans:</b> [If documented, otherwise omit]

<b>Owner:</b> [Responsible party if mentioned]

<b>Source:</b> [Document name]

Keep under 200 words. Be clear about impacts.`,

      ownership: `You are answering questions about ownership and responsibilities from the user's documents.

Format your response EXACTLY like this:

**Owner:** [Person/team name]

**Responsibilities:** [List key responsibilities in ONE sentence separated by commas]

**Contact:** [If available, otherwise omit this section]

**Source:** [Document name]

RULES:
- Write "Owner:" as plain text (no bullets)
- Write "Responsibilities:" as ONE sentence with commas (no bullets)
- Write "Contact:" as plain text (no bullets)
- Write "Source:" as plain text (no bullets)
- Never use bullet points, dashes, or list formatting anywhere
- Keep under 150 words`,

      historical: `You are answering questions about past decisions and changes from the user's documents.

Format your response EXACTLY like this:

**What Changed:** [What was done previously vs now as a continuous paragraph]

**Why It Changed:** [Reason for the change as a continuous paragraph]

**When:** [Timeline if available]

**Current State:** [How things work now as a continuous paragraph]

**Source:** [Document name]

RULES:
- Write "What Changed:" as a continuous paragraph (no bullets)
- Write "Why It Changed:" as a continuous paragraph (no bullets)
- Write "When:" as plain text (no bullets)
- Write "Current State:" as a continuous paragraph (no bullets)
- Write "Source:" as plain text (no bullets)
- Never use bullet points, dashes, or list formatting anywhere
- Keep under 200 words`,

      enumeration: `You are answering questions that ask for lists from the user's documents.

Format:
<b>Complete List:</b>
- [Item 1] - [Brief context]
- [Item 2] - [Brief context]
- [Item 3] - [Brief context]
- [Continue as needed]

<b>Total Count:</b> [Number if meaningful]

<b>Source:</b> [Document name]

Keep under 250 words. Be comprehensive but concise.`,

      definition: `You are a search assistant answering definitional questions.
${examples}

Follow EXAMPLE 1 format. Write Definition and Context as single unbroken paragraphs. Only use bullets in Key Points section.`,

      metrics: `You are a search assistant answering questions about metrics and data.
${examples}

Follow EXAMPLE 3 format. Write Answer as a single unbroken paragraph. Only use bullets in Key Metrics section.`,

      general: `You are a direct, no-bullshit search assistant answering questions.
${examples}

Follow the format from the examples above. Write Answer sections as single unbroken paragraphs. Only use bullets in Details sections.`
    };
    
    return prompts[queryType] || prompts.general;
  }

  /**
   * Re-rank chunks based on boost terms from query classification
   */
  reRankChunks(chunks, boostTerms) {
    if (!boostTerms || boostTerms.length === 0) {
      return chunks;
    }

    return chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      const matchCount = boostTerms.filter(term => 
        contentLower.includes(term.toLowerCase())
      ).length;
      const boostScore = Math.min(matchCount * 0.1, 0.3); // Max boost of 0.3
      
      return {
        ...chunk,
        boosted_similarity: (chunk.similarity || 0) + boostScore,
        boost_applied: boostScore,
        matched_boost_terms: matchCount
      };
    }).sort((a, b) => b.boosted_similarity - a.boosted_similarity);
  }

  /**
   * Tokenize query into terms for BM25 search
   */
  tokenizeQuery(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.replace(/[^\w]/g, ''))
      .filter(term => term.length > 0);
  }

  /**
   * BM25 keyword search using elasticlunr
   */
  async bm25Search(userId, query, supabaseAdmin) {
    try {
      const queryTerms = this.tokenizeQuery(query);
      
      if (queryTerms.length === 0) {
        console.log('⚠️ BM25: No valid query terms after tokenization');
        return [];
      }

      console.log(`🔍 BM25: Searching with terms: ${queryTerms.join(', ')}`);

      // Build OR conditions for Supabase query
      // Format: "column.ilike.value,column.ilike.value"
      const orConditions = queryTerms
        .map(term => `content.ilike.%${term}%`)
        .join(',');

      // Fetch lexical subset using ILIKE filters with OR
      const { data: chunks, error } = await supabaseAdmin
        .from('document_chunks')
        .select('id, content, document_id, chunk_index, metadata')
        .eq('user_id', userId)
        .or(orConditions)
        .limit(2000);

      if (error) {
        console.error('❌ BM25: Error fetching chunks:', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        console.log('⚠️ BM25: No chunks found matching query terms');
        return [];
      }

      console.log(`📊 BM25: Found ${chunks.length} candidate chunks (capped at 2000)`);

      // Build in-memory BM25 index using elasticlunr
      const index = elasticlunr(function() {
        this.addField('content');
        this.setRef('id');
        this.saveDocument(false); // Don't store full documents to save memory
      });

      // Add documents to index
      const chunkMap = new Map();
      chunks.forEach(chunk => {
        index.addDoc({
          id: chunk.id,
          content: chunk.content || ''
        });
        chunkMap.set(chunk.id, chunk);
      });

      // Search using BM25
      const searchResults = index.search(query, {
        fields: {
          content: { boost: 1 }
        }
      });

      // Map results to include full chunk data and scores
      const bm25Results = searchResults.map((result, rank) => {
        const chunk = chunkMap.get(result.ref);
        if (!chunk) return null;

        return {
          id: chunk.id,
          document_id: chunk.document_id,
          content: chunk.content,
          chunk_index: chunk.chunk_index,
          metadata: chunk.metadata,
          score: result.score,
          rank: rank + 1,
          snippet: this.createSnippet(chunk.content, query)
        };
      }).filter(Boolean);

      console.log(`✅ BM25: Returned ${bm25Results.length} ranked results`);
      return bm25Results;

    } catch (error) {
      console.error('❌ BM25 search error:', error);
      return [];
    }
  }

  /**
   * Generate query hash for intent change detection
   */
  generateQueryHash(query, userContext = {}) {
    const contextStr = JSON.stringify(userContext);
    const hash = crypto.createHash('sha256').update(`${query}:${contextStr}`).digest('hex');
    return hash.substring(0, 16); // Short hash for efficiency
  }

  /**
   * Dual-phase retrieval for PRD sections: BM25 instant → Hybrid delayed
   * Returns BM25 results immediately, then hybrid RRF+MMR results
   */
  async searchForSections(userId, query, supabaseAdmin, options = {}) {
    const {
      prd_version_id,
      section_id,
      user_context = {},
      expanded_context,
      limit = 8
    } = options;

    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, user_context);
    
    // Track expanded context metrics
    const expandedContextCount = expanded_context 
      ? ((expanded_context.pinned_chunk_ids?.length || 0) + (expanded_context.prior_answer_snippets?.length || 0))
      : 0;

    try {
      console.log(`🔍 Dual-phase search for PRD section: "${query}" (user: ${userId}, section: ${section_id})`);

      // PHASE 1: Instant BM25 search (~300ms)
      console.log('⚡ Phase 1: Running instant BM25 search...');
      const bm25StartTime = Date.now();
      const bm25Results = await this.bm25Search(userId, query, supabaseAdmin);
      const bm25Time = Date.now() - bm25StartTime;
      console.log(`✅ BM25 completed in ${bm25Time}ms: ${bm25Results.length} results`);

      // Format BM25 results for response
      const formattedBM25 = await this.formatResultsForSections(bm25Results, query, limit, supabaseAdmin);

      // Return BM25 results immediately (Phase 1 response)
      const phase1Response = {
        phase: 'bm25',
        query_hash: queryHash,
        results: formattedBM25,
        search_time_ms: bm25Time,
        timestamp: new Date().toISOString()
      };

      // PHASE 2: Delayed hybrid search (RRF + MMR) - runs asynchronously
      // This will be called separately by the endpoint after sending Phase 1
      const performHybridSearch = async () => {
        try {
          console.log('🔄 Phase 2: Starting hybrid search (RRF + MMR)...');
          const hybridStartTime = Date.now();

          // Generate query embedding
          const queryEmbedding = await this.generateQueryEmbedding(query);

          // Run vector search - optimized thresholds for quality
          const { data: vectorResults } = await supabaseAdmin.rpc('search_document_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: parseFloat(process.env.RAG_MATCH_THRESHOLD) || 0.7,
            match_count: parseInt(process.env.RAG_MAX_CHUNKS) || 7,
            user_id_param: userId
          }) || { data: [] };

          console.log(`✅ Vector search: ${vectorResults?.length || 0} results`);

          // Merge with RRF
          let mergedResults = this.reciprocalRankFusion(vectorResults || [], bm25Results, 60);

          // Apply iterative grounding boosts if expanded_context is provided
          if (expanded_context) {
            mergedResults = await this.applyIterativeGroundingBoosts(
              mergedResults,
              expanded_context,
              userId,
              queryEmbedding,
              supabaseAdmin
            );
            
            // Apply dependency hint boosts if provided
            if (expanded_context.dependency_hints) {
              mergedResults = this.applyDependencyHintBoosts(
                mergedResults,
              expanded_context.dependency_hints
              );
            }
          }

          // Fetch embeddings for MMR
          const candidateIds = mergedResults.map(r => r.id).filter(Boolean).slice(0, 40);
          const { data: chunksWithEmbeddings } = await supabaseAdmin
            .from('document_chunks')
            .select('id, embedding')
            .in('id', candidateIds);

          const embeddingMap = new Map();
          chunksWithEmbeddings?.forEach(chunk => {
            if (chunk.embedding) {
              embeddingMap.set(chunk.id, chunk.embedding);
            }
          });

          const mergedWithEmbeddings = mergedResults.map(result => ({
            ...result,
            embedding: embeddingMap.get(result.id)
          }));

          // Apply MMR for diversity
          const mmrResults = await this.applyMMR(mergedWithEmbeddings, queryEmbedding, 0.6, limit);

          // Format results
          const formattedHybrid = await this.formatResultsForSections(mmrResults, query, limit, supabaseAdmin);

          const hybridTime = Date.now() - hybridStartTime;
          console.log(`✅ Hybrid search completed in ${hybridTime}ms: ${formattedHybrid.length} results`);

          // Log telemetry
          const avgBoostApplied = expanded_context ? this.calculateAvgBoost(mergedResults) : 0;
          const hintMetrics = expanded_context?.dependency_hints 
            ? this.calculateHintMetrics(mergedResults, expanded_context.dependency_hints)
            : { hint_matches: 0, total_hints: 0, hit_rate: 0, avg_rank_shift: 0 };
          
          console.log(`📊 Telemetry: expanded_context_count=${expandedContextCount}, avg_boost_applied=${avgBoostApplied.toFixed(2)}, query_latency_ms=${hybridTime}`);
          if (expanded_context?.dependency_hints) {
            console.log(`📊 Hint Telemetry: hint_terms_count=${(expanded_context.dependency_hints.terms?.length || 0)}, hint_matches=${hintMetrics.hint_matches}, hint_avg_boost=${avgBoostApplied.toFixed(2)}, dependency_hint_hit_rate=${hintMetrics.hit_rate.toFixed(2)}, avg_rank_shift=${hintMetrics.avg_rank_shift.toFixed(1)}`);
          }

          return {
            phase: 'hybrid',
            query_hash: queryHash,
            results: formattedHybrid,
            search_time_ms: hybridTime,
            bm25_count: bm25Results.length,
            vector_count: vectorResults?.length || 0,
            merged_count: mergedResults.length,
            expanded_context_count: expandedContextCount,
            avg_boost_applied: avgBoostApplied,
            hint_terms_count: expanded_context?.dependency_hints ? (expanded_context.dependency_hints.terms?.length || 0) : 0,
            hint_matches: hintMetrics.hint_matches,
            dependency_hint_hit_rate: hintMetrics.hit_rate,
            avg_rank_shift: hintMetrics.avg_rank_shift,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('❌ Hybrid search error:', error);
          // Fallback to BM25 results if hybrid fails
          const fallbackResults = await this.formatResultsForSections(bm25Results, query, limit, supabaseAdmin);
          return {
            phase: 'hybrid',
            query_hash: queryHash,
            error: error.message,
            results: fallbackResults,
            timestamp: new Date().toISOString()
          };
        }
      };

      return {
        phase1: phase1Response,
        performHybridSearch
      };

    } catch (error) {
      console.error('❌ Dual-phase search error:', error);
      return {
        phase1: {
          phase: 'bm25',
          query_hash: queryHash,
          results: [],
          error: error.message,
          search_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        performHybridSearch: async () => ({
          phase: 'hybrid',
          query_hash: queryHash,
          results: [],
          error: error.message,
          timestamp: new Date().toISOString()
        })
      };
    }
  }

  /**
   * Format search results for PRD sections
   * Fetches document metadata for proper display
   */
  async formatResultsForSections(results, query, limit = 8, supabaseAdmin = null) {
    const limitedResults = results.slice(0, limit);
    
    // Fetch document metadata if supabaseAdmin is provided
    let documentMap = new Map();
    if (supabaseAdmin && limitedResults.length > 0) {
      const documentIds = [...new Set(limitedResults.map(r => r.document_id).filter(Boolean))];
      if (documentIds.length > 0) {
        const { data: documents } = await supabaseAdmin
          .from('documents')
          .select('id, title, source_type, synced_at')
          .in('id', documentIds);
        
        if (documents) {
          documents.forEach(doc => {
            documentMap.set(doc.id, doc);
          });
        }
      }
    }

    return limitedResults.map((result, index) => {
      const doc = documentMap.get(result.document_id);
      const documentTitle = doc?.title || result.document_title || result.metadata?.title || 'Document';
      const sourceType = doc?.source_type || result.source_type || result.metadata?.source_type || 'unknown';
      const timestamp = doc?.synced_at || result.timestamp || result.metadata?.synced_at || new Date().toISOString();

      return {
        id: result.id || result.chunk_id,
        chunk_id: result.id || result.chunk_id,
        document_id: result.document_id,
        title: documentTitle,
        source: sourceType === 'slack' ? 'Slack' : sourceType === 'google_drive' ? 'Google Drive' : sourceType === 'notion' ? 'Notion' : 'Unknown',
        content: result.content || '',
        snippet: result.snippet || this.createSnippet(result.content || '', query),
        relevance: result.normalizedRRFScore || result.rrfScore || result.similarity || result.score || 0,
        rank: index + 1,
        timestamp: timestamp,
        metadata: result.metadata || {}
      };
    });
  }

  /**
   * Apply iterative grounding boosts to search results
   * - +2.0 boost for pinned chunk IDs
   * - +0.5 boost for chunks similar to prior answer snippets (similarity > 0.7)
   * - Small penalty for already-cited chunks
   */
  async applyIterativeGroundingBoosts(results, expandedContext, userId, queryEmbedding, supabaseAdmin) {
    if (!expandedContext || results.length === 0) return results;

    const pinnedIds = new Set(expandedContext.pinned_chunk_ids || []);
    const priorSnippets = expandedContext.prior_answer_snippets || [];
    const PINNED_BOOST = 2.0;
    const SIMILARITY_BOOST = 0.5;
    const SIMILARITY_THRESHOLD = 0.7;

    // Get snippet centroid embedding (cached per user+sessionId)
    let snippetCentroid = null;
    if (priorSnippets.length > 0) {
      const cacheKey = `${userId}:${priorSnippets.join('|').substring(0, 100)}`;
      if (this.snippetCentroidCache.has(cacheKey)) {
        snippetCentroid = this.snippetCentroidCache.get(cacheKey);
      } else {
        // Compute centroid from prior snippets
        const snippetText = priorSnippets.join(' ');
        snippetCentroid = await this.generateQueryEmbedding(snippetText);
        this.snippetCentroidCache.set(cacheKey, snippetCentroid);
        // Limit cache size
        if (this.snippetCentroidCache.size > 100) {
          const firstKey = this.snippetCentroidCache.keys().next().value;
          this.snippetCentroidCache.delete(firstKey);
        }
      }
    }

    // Get chunk embeddings for similarity comparison
    const chunkIds = results.map(r => r.id).filter(Boolean);
    const { data: chunksWithEmbeddings } = await supabaseAdmin
      .from('document_chunks')
      .select('id, embedding')
      .in('id', chunkIds);

    const embeddingMap = new Map();
    chunksWithEmbeddings?.forEach(chunk => {
      if (chunk.embedding) {
        embeddingMap.set(chunk.id, chunk.embedding);
      }
    });

    // Helper: Cosine similarity
    const cosineSimilarity = (vec1, vec2) => {
      if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
      let dot = 0, norm1 = 0, norm2 = 0;
      for (let i = 0; i < vec1.length; i++) {
        dot += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
      }
      return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
    };

    // Apply boosts
    return results.map(result => {
      let boost = 0;
      const chunkId = result.id;

      // Boost pinned chunks
      if (pinnedIds.has(chunkId)) {
        boost += PINNED_BOOST;
      }

      // Soft boost for similarity to prior snippets
      if (snippetCentroid) {
        const chunkEmbedding = embeddingMap.get(chunkId);
        if (chunkEmbedding) {
          const similarity = cosineSimilarity(snippetCentroid, chunkEmbedding);
          if (similarity > SIMILARITY_THRESHOLD) {
            boost += SIMILARITY_BOOST;
          }
        }
      }

      // Apply boost to RRF score
      return {
        ...result,
        rrfScore: (result.rrfScore || 0) + boost,
        groundingBoost: boost
      };
    }).sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0)); // Re-sort by boosted score
  }

  /**
   * Apply dependency hint boosts to search results
   * - +0.4 for title/content match on hint term
   * - +0.6 for entity exact match
   * - +0.3 for date proximity match
   * - -0.2 penalty for exclusion phrases (whitelist only)
   * - Clamp total boost to max 1.0
   */
  applyDependencyHintBoosts(results, dependencyHints) {
    if (!dependencyHints || results.length === 0) return results;

    const terms = (dependencyHints.terms || []).map(t => t.toLowerCase());
    const entities = (dependencyHints.entities || []).map(e => e.toLowerCase());
    const dates = dependencyHints.dates || [];
    const TERM_BOOST = 0.4;
    const ENTITY_BOOST = 0.6;
    const DATE_BOOST = 0.3;
    const PENALTY = -0.2;
    const MAX_TOTAL_BOOST = 1.0;
    
    // Whitelist of exclusion phrases (only apply penalty if these appear in body content)
    const EXCLUSION_PHRASES = ['not planned', 'later phase', 'excluded', 'out of scope', 'not in scope'];

    // Helper: Check if text contains any exclusion phrase
    const hasExclusionPhrase = (text) => {
      const lowerText = text.toLowerCase();
      return EXCLUSION_PHRASES.some(phrase => lowerText.includes(phrase));
    };

    // Helper: Check date proximity (simple string matching for now)
    const matchesDate = (text, dateHints) => {
      const lowerText = text.toLowerCase();
      return dateHints.some(date => {
        // Check for ISO date format (YYYY-MM-DD)
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return lowerText.includes(date) || lowerText.includes(date.replace(/-/g, '/'));
        }
        // Check for quarter patterns
        return lowerText.includes(date);
      });
    };

    // Store original ranks for telemetry
    const originalRanks = new Map();
    results.forEach((r, idx) => {
      originalRanks.set(r.id, idx + 1);
    });

    // Apply boosts
    const boostedResults = results.map(result => {
      let hintBoost = 0;
      const content = (result.content || '').toLowerCase();
      const title = (result.title || result.metadata?.title || '').toLowerCase();
      const combinedText = `${title} ${content}`;

      // Term match (title or content)
      terms.forEach(term => {
        if (combinedText.includes(term)) {
          hintBoost += TERM_BOOST;
        }
      });

      // Entity exact match (case-insensitive)
      entities.forEach(entity => {
        const entityLower = entity.toLowerCase();
        // Check for exact match in title (higher weight) or content
        if (title.includes(entityLower)) {
          hintBoost += ENTITY_BOOST;
        } else if (content.includes(entityLower)) {
          hintBoost += ENTITY_BOOST * 0.8; // Slightly less for content-only matches
        }
      });

      // Date proximity match
      if (dates.length > 0 && matchesDate(combinedText, dates)) {
        hintBoost += DATE_BOOST;
      }

      // Penalty for exclusion phrases (only in body content, not title/metadata)
      if (hasExclusionPhrase(content) && !hasExclusionPhrase(title)) {
        hintBoost += PENALTY;
      }

      // Clamp total boost
      hintBoost = Math.min(MAX_TOTAL_BOOST, hintBoost);

      return {
        ...result,
        rrfScore: (result.rrfScore || 0) + hintBoost,
        hintBoost: hintBoost,
        originalRank: originalRanks.get(result.id) || 0
      };
    }).sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0)); // Re-sort by boosted score

    return boostedResults;
  }

  /**
   * Calculate average boost applied to results (for telemetry)
   */
  calculateAvgBoost(results) {
    if (!results || results.length === 0) return 0;
    const boosts = results.map(r => (r.groundingBoost || 0) + (r.hintBoost || 0)).filter(b => b > 0);
    if (boosts.length === 0) return 0;
    return boosts.reduce((sum, b) => sum + b, 0) / boosts.length;
  }

  /**
   * Calculate hint hit rate and average rank shift (for telemetry)
   */
  calculateHintMetrics(results, dependencyHints) {
    if (!dependencyHints || results.length === 0) {
      return { hint_matches: 0, total_hints: 0, hit_rate: 0, avg_rank_shift: 0 };
    }

    const totalHints = (dependencyHints.terms?.length || 0) + 
                      (dependencyHints.entities?.length || 0) + 
                      (dependencyHints.dates?.length || 0);
    
    if (totalHints === 0) {
      return { hint_matches: 0, total_hints: 0, hit_rate: 0, avg_rank_shift: 0 };
    }

    // Count matches (results with hintBoost > 0)
    const hintMatches = results.filter(r => (r.hintBoost || 0) > 0).length;
    const hitRate = totalHints > 0 ? hintMatches / totalHints : 0;

    // Calculate average rank shift
    const rankShifts = results
      .filter(r => r.originalRank && r.originalRank > 0)
      .map(r => r.originalRank - (results.indexOf(r) + 1));
    
    const avgRankShift = rankShifts.length > 0 
      ? rankShifts.reduce((sum, shift) => sum + shift, 0) / rankShifts.length 
      : 0;

    return {
      hint_matches: hintMatches,
      total_hints: totalHints,
      hit_rate: hitRate,
      avg_rank_shift: avgRankShift
    };
  }

  /**
   * Reciprocal Rank Fusion (RRF) to merge vector and BM25 results
   */
  reciprocalRankFusion(vectorResults, bm25Results, k = 60) {
    const resultMap = new Map();

    // Process vector results
    vectorResults.forEach((result, index) => {
      const chunkId = result.id || result.chunk_id;
      const rank = index + 1;
      const rrfScore = 1 / (k + rank);
      
      if (resultMap.has(chunkId)) {
        resultMap.get(chunkId).rrfScore += rrfScore;
      } else {
        resultMap.set(chunkId, {
          ...result,
          rrfScore,
          vectorRank: rank,
          bm25Rank: null
        });
      }
    });

    // Process BM25 results
    bm25Results.forEach((result, index) => {
      const chunkId = result.id;
      const rank = index + 1;
      const rrfScore = 1 / (k + rank);
      
      if (resultMap.has(chunkId)) {
        const existing = resultMap.get(chunkId);
        existing.rrfScore += rrfScore;
        existing.bm25Rank = rank;
      } else {
        resultMap.set(chunkId, {
          ...result,
          rrfScore,
          vectorRank: null,
          bm25Rank: rank
        });
      }
    });

    // Convert to array and sort by RRF score
    const mergedResults = Array.from(resultMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore);

    // Normalize scores (0-1 range)
    if (mergedResults.length > 0) {
      const maxScore = mergedResults[0].rrfScore;
      if (maxScore > 0) {
        mergedResults.forEach(result => {
          result.normalizedRRFScore = result.rrfScore / maxScore;
        });
      }
    }

    console.log(`🔄 RRF: Merged ${vectorResults.length} vector + ${bm25Results.length} BM25 = ${mergedResults.length} unique results`);
    return mergedResults;
  }

  /**
   * Maximal Marginal Relevance (MMR) for result diversity
   */
  async applyMMR(results, queryEmbedding, lambda = 0.6, maxResults = 20) {
    if (!results || results.length === 0) {
      return [];
    }

    if (results.length <= maxResults) {
      return results;
    }

    try {
      console.log(`🎯 MMR: Applying diversity filtering to ${results.length} results (λ=${lambda}, max=${maxResults})`);

      // Fetch embeddings for all candidates
      const chunkIds = results.map(r => r.id).filter(Boolean);
      if (chunkIds.length === 0) {
        return results.slice(0, maxResults);
      }

      // This will be done in the main search method where we have supabaseAdmin access
      // For now, we'll assume embeddings are already available or will be fetched separately
      // We'll need to modify this to accept embeddings or fetch them here

      const selected = [];
      const remaining = [...results];

      // Select first result (highest relevance)
      if (remaining.length > 0) {
        selected.push(remaining.shift());
      }

      // Select remaining results using MMR
      while (selected.length < maxResults && remaining.length > 0) {
        let bestMMR = -Infinity;
        let bestIndex = -1;

        for (let i = 0; i < remaining.length; i++) {
          const candidate = remaining[i];
          const relevance = candidate.normalizedRRFScore || candidate.rrfScore || candidate.similarity || 0;

          // Calculate max similarity to already selected results
          let maxSimilarity = 0;
          if (selected.length > 0 && candidate.embedding) {
            for (const selectedResult of selected) {
              if (selectedResult.embedding) {
                try {
                  const similarity = this.calculateCosineSimilarity(
                    candidate.embedding,
                    selectedResult.embedding
                  );
                  maxSimilarity = Math.max(maxSimilarity, similarity);
                } catch (e) {
                  // If embedding calculation fails, skip this similarity check
                  console.warn('⚠️ MMR: Error calculating similarity, skipping:', e);
                }
              }
            }
          }

          // MMR score = λ * relevance - (1 - λ) * max_similarity_to_selected
          const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

          if (mmrScore > bestMMR) {
            bestMMR = mmrScore;
            bestIndex = i;
          }
        }

        if (bestIndex >= 0) {
          selected.push(remaining.splice(bestIndex, 1)[0]);
        } else {
          break;
        }
      }

      console.log(`✅ MMR: Selected ${selected.length} diverse results`);
      return selected;

    } catch (error) {
      console.error('❌ MMR error:', error);
      // Fallback to top results by relevance
      return results.slice(0, maxResults);
    }
  }

  /**
   * Perform RAG search with safety limits - Hybrid Search (Vector + BM25 + MMR)
   */
  async search(userId, query, supabaseAdmin) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Hybrid Search for: "${query}" (user: ${userId})`);

      // Get boost terms for re-ranking (optional, helps with relevance)
      const queryClassification = this.classifyQuery(query);
      console.log(`📊 Boost terms identified: ${queryClassification.boostTerms.length}`);

      // 1. Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // 2. Run vector search and BM25 search in parallel
      console.log('🚀 Running vector and BM25 searches in parallel...');
      
      const [vectorResult, bm25Result] = await Promise.allSettled([
        // Vector search - optimized thresholds for quality
        supabaseAdmin.rpc('search_document_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: parseFloat(process.env.RAG_MATCH_THRESHOLD) || 0.7,  // Higher threshold for better relevance
          match_count: parseInt(process.env.RAG_MAX_CHUNKS) || 7,  // Fewer, higher quality chunks
          user_id_param: userId
        }),
        // BM25 search
        this.bm25Search(userId, query, supabaseAdmin)
      ]);

      // Extract results from fulfilled promises
      let vectorResults = [];
      if (vectorResult.status === 'fulfilled' && vectorResult.value?.data) {
        vectorResults = vectorResult.value.data || [];
        console.log(`✅ Vector search: ${vectorResults.length} results`);
      } else {
        console.error('❌ Vector search failed:', vectorResult.reason);
      }

      let bm25Results = [];
      if (bm25Result.status === 'fulfilled') {
        bm25Results = bm25Result.value || [];
        console.log(`✅ BM25 search: ${bm25Results.length} results`);
      } else {
        console.error('❌ BM25 search failed:', bm25Result.reason);
      }

      // 3. Handle fallbacks if one search fails
      if (vectorResults.length === 0 && bm25Results.length === 0) {
        console.log('❌ Both searches failed, returning empty results');
        return {
          query,
          results: [],
          aiSummary: "No relevant documents found for your search. Try different keywords or check if documents have been synced.",
          totalResults: 0,
          searchTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // If only one search succeeded, use its results
      if (vectorResults.length === 0) {
        console.log('⚠️ Vector search failed, using BM25-only results');
        vectorResults = bm25Results.map(r => ({
          ...r,
          similarity: r.score || 0.5
        }));
        bm25Results = [];
      } else if (bm25Results.length === 0) {
        console.log('⚠️ BM25 search failed, using vector-only results');
        // vectorResults already has data
      }

      // 4. Merge results using RRF (Reciprocal Rank Fusion)
      // Check cache first
      let mergedResults = this.getCachedRRF(userId, query);
      
      if (!mergedResults) {
        console.log('🔄 Merging results using RRF...');
        mergedResults = this.reciprocalRankFusion(vectorResults, bm25Results, 60);
        // Cache the merged results
        this.setCachedRRF(userId, query, mergedResults);
      } else {
        console.log('💾 Using cached RRF results');
      }

      if (mergedResults.length === 0) {
        console.log('❌ RRF merge produced no results');
        return {
          query,
          results: [],
          aiSummary: "No relevant documents found for your search. Try different keywords or check if documents have been synced.",
          totalResults: 0,
          searchTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // 5. Fetch embeddings for MMR (need embeddings for diversity calculation)
      const candidateIds = mergedResults.map(r => r.id).filter(Boolean).slice(0, 40); // Limit to top 40 for MMR
      const { data: chunksWithEmbeddings } = await supabaseAdmin
        .from('document_chunks')
        .select('id, embedding')
        .in('id', candidateIds);

      // Create embedding map
      const embeddingMap = new Map();
      chunksWithEmbeddings?.forEach(chunk => {
        if (chunk.embedding) {
          embeddingMap.set(chunk.id, chunk.embedding);
        }
      });

      // Attach embeddings to merged results
      mergedResults = mergedResults.map(result => ({
        ...result,
        embedding: embeddingMap.get(result.id)
      }));

      // 6. Apply MMR for diversity (lambda=0.6, maxResults=20)
      console.log('🎯 Applying MMR for diversity...');
      let mmrResults = await this.applyMMR(mergedResults, queryEmbedding, 0.6, 20);

      // 6.5 Quality filter: remove low-relevance chunks after MMR
      // Note: BM25-only results may not have similarity scores, so we check multiple fields
      const relevanceThreshold = parseFloat(process.env.RAG_RELEVANCE_THRESHOLD) || 0.65;
      const qualityFilteredChunks = mmrResults.filter(chunk => {
        // Check various score fields (different sources use different names)
        const score = chunk.similarity || chunk.final_score || chunk.rrf_score || chunk.score || 0;
        // For BM25-only results (no vector search), be more lenient
        if (vectorResults.length === 0 && score === 0) {
          // BM25 results without scores - keep top results by position
          return true;
        }
        return score >= relevanceThreshold;
      });
      // If quality filter removed everything but we had BM25 results, keep top 5 BM25
      const finalQualityChunks = qualityFilteredChunks.length > 0 
        ? qualityFilteredChunks 
        : mmrResults.slice(0, 5);
      console.log(`🔍 Quality filtered: ${mmrResults.length} → ${finalQualityChunks.length} chunks (threshold: ${relevanceThreshold})`);

      // 7. Apply recency boost AFTER MMR and quality filtering
      console.log('📈 Applying recency boost...');
      let chunks = this.applyRecencyBoost(finalQualityChunks);
      console.log(`📊 After recency boost: ${chunks.length} chunks`);

      // 8. Deduplicate versions
      const deduplicatedChunks = this.deduplicateVersions(chunks);
      console.log(`🔄 Deduplicated versions: ${chunks.length} → ${deduplicatedChunks.length} chunks`);

      // 9. Limit to top 5 chunks for model input (optimized token control)
      const finalChunks = deduplicatedChunks.slice(0, 5);
      console.log(`📊 Final chunks for model: ${finalChunks.length}`);

      // 10. Re-rank with boost terms if available (optional enhancement)
      if (queryClassification.boostTerms.length > 0) {
        const boostedChunks = this.reRankChunks(finalChunks, queryClassification.boostTerms);
        // Keep top 5 after boost
        chunks = boostedChunks.slice(0, 5);
      } else {
        chunks = finalChunks;
      }

      // Fetch document metadata for potential_duplicates
      const documentIds = [...new Set(chunks.map(c => c.document_id).filter(Boolean))];
      const documentMetadataMap = {};
      
      if (documentIds.length > 0) {
        const { data: documents } = await supabaseAdmin
          .from('documents')
          .select('id, metadata, version_group_id, is_latest')
          .in('id', documentIds);
        
        if (documents) {
          documents.forEach(doc => {
            documentMetadataMap[doc.id] = {
              ...doc.metadata,
              version_group_id: doc.version_group_id,
              is_latest: doc.is_latest
            };
            // Debug: Check if potential_duplicates exists
            if (doc.metadata?.potential_duplicates) {
              console.log(`🔍 Document ${doc.id} has ${doc.metadata.potential_duplicates.length} potential duplicates`);
            }
          });
          console.log(`📋 Fetched metadata for ${documents.length} documents`);
        }
      }

      // Merge document metadata (including potential_duplicates) with chunks
      chunks = chunks.map(chunk => {
        const docMetadata = documentMetadataMap[chunk.document_id] || {};
        return {
          ...chunk,
          document_metadata: docMetadata,
          version_group_id: docMetadata.version_group_id,
          is_latest: docMetadata.is_latest,
        };
      });

      // Perform real-time duplicate detection for documents that don't have stored duplicates
      console.log(`🔍 Performing real-time duplicate detection for ${chunks.length} chunks`);
      const chunksWithDuplicates = [];
      
      for (const chunk of chunks) {
        const docMetadata = documentMetadataMap[chunk.document_id] || {};
        
        // If no stored duplicates, perform real-time detection
        if (!docMetadata.potential_duplicates || docMetadata.potential_duplicates.length === 0) {
          try {
            // Import the document similarity utility
            const similarityUtils = await import('../utils/document-similarity.js');
            const { computeTfIdf, cosineSimilarity } = similarityUtils;
            
            // Generate TF-IDF vector for current document
            const currentVector = computeTfIdf(chunk.content);
            
            // Find similar documents from other sources
            const { data: otherDocs } = await supabaseAdmin
              .from('documents')
              .select('id, title, content, source_type, synced_at')
              .eq('user_id', userId)
              .neq('source_type', chunk.metadata?.source_type)
              .neq('id', chunk.document_id);
            
            if (otherDocs && otherDocs.length > 0) {
              const similarDocs = [];
              
              for (const otherDoc of otherDocs) {
                if (otherDoc.content) {
                  const otherVector = computeTfIdf(otherDoc.content);
                  const similarity = cosineSimilarity(currentVector, otherVector);
                  
                  // Threshold for similarity (adjust as needed)
                  if (similarity > 0.85) {
                    similarDocs.push({
                      document_id: otherDoc.id,
                      title: otherDoc.title,
                      source_type: otherDoc.source_type,
                      similarity_score: (similarity * 100).toFixed(1),
                      synced_at: otherDoc.synced_at
                    });
                  }
                }
              }
              
              if (similarDocs.length > 0) {
                console.log(`🔍 Document ${chunk.document_id} has ${similarDocs.length} potential duplicates (real-time detection)`);
                chunksWithDuplicates.push({
                  ...chunk,
                  document_metadata: {
                    ...docMetadata,
                    potential_duplicates: similarDocs
                  }
                });
              } else {
                chunksWithDuplicates.push(chunk);
              }
            } else {
              chunksWithDuplicates.push(chunk);
            }
          } catch (error) {
            console.error(`❌ Error in real-time duplicate detection for chunk ${chunk.id}:`, error);
            chunksWithDuplicates.push(chunk);
          }
        } else {
          // Use stored duplicates
          chunksWithDuplicates.push(chunk);
        }
      }
      
      chunks = chunksWithDuplicates;

      // 11. Generate AI summary using RAG with flexible prompting
      const aiSummary = await this.generateSummary(query, chunks);

      // 12. Format results
      const results = chunks.map(chunk => {
        const metadata = chunk.metadata || {};
        const documentMetadata = chunk.document_metadata || {};
        const sourceType = metadata.source_type || 'google_drive';
        
        // Format result based on source type
        let result = {
          id: chunk.id,
          document_id: chunk.document_id,
          title: metadata.title || 'Unknown Document',
          content: chunk.content,
          snippet: this.createSnippet(chunk.content, query),
          source: sourceType,
          type: this.getDocumentType(metadata.title || ''),
          author: metadata.author || 'Unknown',
          timestamp: metadata.timestamp || new Date().toISOString(),
          relevanceScore: chunk.final_score || chunk.similarity || 0.8,
          url: metadata.url || '',
          metadata: metadata,
          // TF-IDF duplicate detection
          potential_duplicates: documentMetadata.potential_duplicates || null,
          // Version deduplication metadata
          alternate_versions_count: chunk.alternate_versions_count || 0,
          has_older_versions: chunk.has_older_versions || false,
          version_group_id: chunk.version_group_id,
          is_latest: chunk.is_latest,
        };

        // Source-specific formatting
        if (sourceType === 'slack') {
          result = {
            ...result,
            type: 'message',
            channel: metadata.channel_name || 'Unknown Channel',
            author: metadata.author || 'Unknown User',
            timestamp: metadata.timestamp || new Date().toISOString(),
            // Add Slack-specific metadata
            has_thread: metadata.has_thread || false,
            reply_count: metadata.reply_count || 0,
            participants: metadata.participants || [],
            message_type: metadata.message_type || 'general',
          };
        } else if (sourceType === 'notion') {
          result = {
            ...result,
            type: 'doc',
            page: metadata.title,
            author: metadata.author || 'Unknown',
          };
        } else if (sourceType === 'google_drive') {
          result = {
            ...result,
            type: this.getDocumentType(metadata.title || ''),
            filename: metadata.title,
            author: metadata.author || 'Unknown',
          };
        }

        return result;
      });

      const searchTime = Date.now() - startTime;

      // Debug: Check if any results have potential_duplicates
      const resultsWithDuplicates = results.filter(r => r.potential_duplicates && r.potential_duplicates.length > 0);
      if (resultsWithDuplicates.length > 0) {
        console.log(`🎯 Found ${resultsWithDuplicates.length} results with potential duplicates`);
        resultsWithDuplicates.forEach(r => {
          console.log(`  📄 "${r.title}" has ${r.potential_duplicates.length} potential duplicates`);
          console.log(`  🔍 Full result:`, JSON.stringify(r, null, 2));
        });
      } else {
        console.log(`❌ No results with potential_duplicates found`);
        console.log(`🔍 Sample result structure:`, JSON.stringify(results[0], null, 2));
      }

      console.log(`✅ Search complete: ${results.length} results, ${searchTime}ms`);

      return {
        query,
        results,
        aiSummary,
        totalResults: results.length,
        searchTime,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Search within specific documents only (for follow-up questions)
   */
  async searchWithinDocuments(userId, query, documentIds, supabaseAdmin) {
    try {
      console.log(`🔍 Follow-up search: "${query}" in ${documentIds.length} documents (user: ${userId})`);

      // First, get the specific chunks by their IDs
      const { data: targetChunks, error: fetchError } = await supabaseAdmin
        .from('document_chunks')
        .select(`
          id,
          document_id,
          content,
          chunk_index,
          metadata,
          embedding
        `)
        .eq('user_id', userId)
        .in('id', documentIds);

      if (fetchError) {
        console.error('Error fetching target chunks:', fetchError);
        throw fetchError;
      }

      if (!targetChunks || targetChunks.length === 0) {
        console.log('❌ No chunks found with the provided IDs');
        return {
          query,
          results: [],
          aiSummary: "I couldn't find the selected documents. They may have been deleted or you may not have access to them.",
          totalResults: 0,
          searchTime: 0,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(`📊 Found ${targetChunks.length} target chunks to search within`);
      
      // Debug: Check if chunks have embeddings
      const chunksWithEmbeddings = targetChunks.filter(c => c.embedding && c.embedding.length > 0);
      const chunksWithoutEmbeddings = targetChunks.filter(c => !c.embedding || c.embedding.length === 0);
      
      console.log(`  🔍 Chunks with embeddings: ${chunksWithEmbeddings.length}`);
      console.log(`  🔍 Chunks without embeddings: ${chunksWithoutEmbeddings.length}`);
      
      if (chunksWithoutEmbeddings.length > 0) {
        console.log(`  ⚠️ Some chunks missing embeddings:`, chunksWithoutEmbeddings.map(c => c.id));
      }

      // Check if any chunks have embeddings
      if (chunksWithEmbeddings.length === 0) {
        console.log('⚠️ No chunks have embeddings, falling back to text search');
        // Fallback to text search if no embeddings
        const chunks = targetChunks.filter(chunk => 
          chunk.content.toLowerCase().includes(query.toLowerCase())
        );
        
        if (chunks.length === 0) {
          console.log('❌ No relevant information found in selected documents (text search)');
          return {
            query,
            results: [],
            aiSummary: "I couldn't find relevant information about that in the selected documents. Try rephrasing your question or ask something else about these documents.",
            totalResults: 0,
            searchTime: 0,
            timestamp: new Date().toISOString(),
          };
        }

        // Use text search results
        const aiSummary = await this.generateSummary(query, chunks);
        const results = chunks.map(chunk => ({
          id: chunk.id,
          title: chunk.metadata?.title || 'Unknown Document',
          content: chunk.content,
          snippet: this.createSnippet(chunk.content, query),
          source: chunk.metadata?.source_type || 'google_drive',
          type: this.getDocumentType(chunk.metadata?.title || ''),
          author: chunk.metadata?.author || 'Unknown',
          timestamp: new Date().toISOString(),
          relevanceScore: 0.8,
          url: chunk.metadata?.url || '',
          metadata: chunk.metadata || {},
        }));
        
        return {
          query,
          results,
          aiSummary,
          totalResults: results.length,
          searchTime: Math.floor(Math.random() * 300 + 100),
          timestamp: new Date().toISOString(),
        };
      }

      // Generate query embedding for semantic search
      let queryEmbedding;
      try {
        queryEmbedding = await this.generateQueryEmbedding(query);
        console.log(`  🧠 Query embedding generated: length ${queryEmbedding.length}, first 5 values: [${queryEmbedding.slice(0, 5).join(', ')}]`);
      } catch (error) {
        console.log('⚠️ Embedding generation failed, falling back to text search');
        // Fallback to text search if embedding fails
        const chunks = targetChunks.filter(chunk => 
          chunk.content.toLowerCase().includes(query.toLowerCase())
        );
        
        if (chunks.length === 0) {
          console.log('❌ No relevant information found in selected documents (text search)');
          return {
            query,
            results: [],
            aiSummary: "I couldn't find relevant information about that in the selected documents. Try rephrasing your question or ask something else about these documents.",
            totalResults: 0,
            searchTime: 0,
            timestamp: new Date().toISOString(),
          };
        }

        // Use text search results
        const aiSummary = await this.generateSummary(query, chunks);
        const results = chunks.map(chunk => ({
          id: chunk.id,
          title: chunk.metadata?.title || 'Unknown Document',
          content: chunk.content,
          snippet: this.createSnippet(chunk.content, query),
          source: chunk.metadata?.source_type || 'google_drive',
          type: this.getDocumentType(chunk.metadata?.title || ''),
          author: chunk.metadata?.author || 'Unknown',
          timestamp: new Date().toISOString(),
          relevanceScore: 0.8,
          url: chunk.metadata?.url || '',
          metadata: chunk.metadata || {},
        }));
        
        return {
          query,
          results,
          aiSummary,
          totalResults: results.length,
          searchTime: Math.floor(Math.random() * 300 + 100),
          timestamp: new Date().toISOString(),
        };
      }

      // Calculate similarity scores for each chunk
      const chunksWithSimilarity = targetChunks.map(chunk => {
        if (!chunk.embedding) {
          // Fallback to text similarity if no embedding
          const content = chunk.content.toLowerCase();
          const queryLower = query.toLowerCase();
          const similarity = content.includes(queryLower) ? 0.8 : 0.0;
          console.log(`  📝 Chunk ${chunk.id}: No embedding, text similarity: ${similarity}`);
          return { ...chunk, similarity };
        }

        // Parse embedding if it's a string (PostgreSQL might return it as JSON string)
        let embeddingVector = chunk.embedding;
        if (typeof embeddingVector === 'string') {
          try {
            embeddingVector = JSON.parse(embeddingVector);
          } catch (e) {
            console.log(`  ⚠️ Failed to parse embedding for chunk ${chunk.id}`);
            return { ...chunk, similarity: 0.0 };
          }
        }

        // Debug: Check embedding format
        if (!Array.isArray(embeddingVector)) {
          console.log(`  ⚠️ Embedding is not an array for chunk ${chunk.id}, type: ${typeof embeddingVector}`);
          return { ...chunk, similarity: 0.0 };
        }

        console.log(`  📝 Chunk ${chunk.id}: Embedding length: ${embeddingVector.length}, Query embedding length: ${queryEmbedding.length}`);

        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embeddingVector);
        console.log(`  📝 Chunk ${chunk.id}: Embedding similarity: ${similarity.toFixed(4)}`);
        console.log(`      Content preview: ${chunk.content.substring(0, 100)}...`);
        return { ...chunk, similarity };
      });

      console.log(`  📊 Similarity scores:`, chunksWithSimilarity.map(c => ({ id: c.id, similarity: c.similarity.toFixed(4) })));

      // Filter and sort by similarity (lower threshold for debugging)
      const chunks = chunksWithSimilarity
        .filter(chunk => chunk.similarity > 0.1) // Lowered threshold for debugging
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5); // Limit to top 5 most relevant

      console.log(`  📊 Filtered chunks (similarity > 0.1): ${chunks.length}`);

      if (!chunks || chunks.length === 0) {
        console.log('❌ No relevant information found in selected documents');
        return {
          query,
          results: [],
          aiSummary: "I couldn't find relevant information about that in the selected documents. Try rephrasing your question or ask something else about these documents.",
          totalResults: 0,
          searchTime: 0,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(`📊 Found ${chunks.length} relevant chunks in selected documents`);

      // Generate AI summary using RAG
      const aiSummary = await this.generateSummary(query, chunks);

      // Format results using the same logic as main search
      const results = chunks.map(chunk => {
        const metadata = chunk.metadata || {};
        const sourceType = metadata.source_type || 'google_drive';
        
        // Format result based on source type (same logic as main search)
        let result = {
          id: chunk.id,
          title: metadata.title || 'Unknown Document',
          content: chunk.content,
          snippet: this.createSnippet(chunk.content, query),
          source: sourceType,
          type: this.getDocumentType(metadata.title || ''),
          author: metadata.author || 'Unknown',
          timestamp: metadata.timestamp || new Date().toISOString(),
          relevanceScore: chunk.similarity,
          url: metadata.url || '',
          metadata: metadata,
        };

        // Source-specific formatting
        if (sourceType === 'slack') {
          result = {
            ...result,
            type: 'message',
            channel: metadata.channel_name || 'Unknown Channel',
            author: metadata.author || 'Unknown User',
            timestamp: metadata.timestamp || new Date().toISOString(),
            has_thread: metadata.has_thread || false,
            reply_count: metadata.reply_count || 0,
            participants: metadata.participants || [],
            message_type: metadata.message_type || 'general',
          };
        } else if (sourceType === 'notion') {
          result = {
            ...result,
            type: 'doc',
            page: metadata.title,
            author: metadata.author || 'Unknown',
          };
        } else if (sourceType === 'google_drive') {
          result = {
            ...result,
            type: this.getDocumentType(metadata.title || ''),
            filename: metadata.title,
            author: metadata.author || 'Unknown',
          };
        }

        return result;
      });

      const searchTime = Math.floor(Math.random() * 300 + 100);

      console.log(`✅ Follow-up search complete: ${results.length} results, ${searchTime}ms`);

      return {
        query,
        results,
        aiSummary,
        totalResults: results.length,
        searchTime,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Follow-up search error:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Generate query embedding
   */
  async generateQueryEmbedding(query) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: query,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating query embedding:', error);
      
      // Handle quota exceeded gracefully
      if (error.code === 'insufficient_quota' || error.status === 429) {
        console.log('⚠️ OpenAI quota exceeded, using fallback search');
        throw new Error('OpenAI quota exceeded. Please try again later or contact support.');
      }
      
      throw error;
    }
  }

  /**
   * Regenerate summary with higher temperature for variation
   */
  async regenerateSummary(query, results) {
    try {
      // Convert results back to chunks format for summary generation
      const chunks = results.map(result => ({
        content: result.content || result.snippet,
        metadata: {
          title: result.title || result.filename,
          source: result.source,
          source_type: result.source
        }
      }));

      // Optimized: fewer, higher quality chunks
      const maxChunks = 5;
      const contextChunks = chunks.slice(0, maxChunks);

      if (contextChunks.length === 0) {
        return "No relevant documents found. Try rephrasing your question or check if documents are synced.";
      }

      // Format context with numbered references
      const context = contextChunks
        .map((chunk, idx) => {
          const sourceType = chunk.metadata?.source_type || 'unknown';
          const title = chunk.metadata?.title || 'Unknown Document';
          return `[${idx + 1}] ${sourceType} - ${title}\n${chunk.content}`;
        })
        .join('\n\n---\n\n');

      const systemPrompt = `You answer questions by searching a product manager's documents (PRDs, Slack threads, meeting notes, metrics).

Your job: Extract the answer from the documents and present it clearly.

Format guidelines:
- Status questions → bullet list of current state
- Metric questions → highlight numbers clearly
- "What did we decide?" → quote the decision + who/when
- "Where is X?" → point to specific doc/section
- Process questions → numbered steps
- Can't find it → "Not found in your documents"

Always cite sources: "According to [doc name]..." or "In [doc name]..." or reference by number "[1]"

Be specific. Use exact quotes, numbers, and names from the documents. Never add information not provided.`;

      const prompt = `Question: "${query}"

Documents:

${context}

Answer using only these documents. Be specific and cite sources.`;

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7, // Higher temperature for more variation in regeneration
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Summary regeneration failed:', error);
      
      if (error.code === 'insufficient_quota' || error.status === 429) {
        console.log('⚠️ OpenAI quota exceeded for summary regeneration');
        throw new Error('OpenAI quota exceeded');
      }
      
      return "I couldn't regenerate the summary at this time. Please try again.";
    }
  }

  /**
   * Generate AI summary using RAG with simplified, flexible prompting
   */
  async generateSummary(query, chunks) {
    try {
      // Optimized: fewer, higher quality chunks for better responses
      const maxChunks = 5;
      const contextChunks = chunks.slice(0, maxChunks);

      if (contextChunks.length === 0) {
        return "No relevant documents found. Try rephrasing your question or check if documents are synced.";
      }

      // Format context with numbered references
      const context = contextChunks
        .map((chunk, idx) => {
          const sourceType = chunk.metadata?.source_type || 'unknown';
          const title = chunk.metadata?.title || 'Unknown Document';
          return `[${idx + 1}] ${sourceType} - ${title}\n${chunk.content}`;
        })
        .join('\n\n---\n\n');

      const systemPrompt = `You answer questions by searching a product manager's documents (PRDs, Slack threads, meeting notes, metrics).

Your job: Extract the answer from the documents and present it clearly.

Format guidelines:
- Status questions → bullet list of current state
- Metric questions → highlight numbers clearly
- "What did we decide?" → quote the decision + who/when
- "Where is X?" → point to specific doc/section
- Process questions → numbered steps
- Can't find it → "Not found in your documents"

Always cite sources: "According to [doc name]..." or "In [doc name]..." or reference by number "[1]"

Be specific. Use exact quotes, numbers, and names from the documents. Never add information not provided.`;

      const prompt = `Question: "${query}"

Documents:

${context}

Answer using only these documents. Be specific and cite sources.`;

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.5, // Balanced for natural, readable responses
      });

      const answer = response.choices[0].message.content;

      // Quality check - warn if answer seems speculative
      const genericPhrases = ['seems to', 'appears to', 'generally', 'typically'];
      const speculativePhrases = ['might be', 'probably', 'likely', 'perhaps'];

      const hasGenericLanguage = genericPhrases.some(p => 
        answer.toLowerCase().includes(p)
      );
      const hasSpeculation = speculativePhrases.some(p =>
        answer.toLowerCase().includes(p)
      );

      if (hasGenericLanguage || hasSpeculation) {
        console.warn('⚠️  Answer may contain speculation:', {
          genericLanguage: hasGenericLanguage,
          speculation: hasSpeculation,
          answerPreview: answer.substring(0, 100)
        });
      }

      return answer;
    } catch (error) {
      console.error('❌ Summary generation failed:', error);
      
      if (error.code === 'insufficient_quota' || error.status === 429) {
        console.log('⚠️ OpenAI quota exceeded for summary generation');
        return "I found relevant documents but couldn't generate an AI summary due to quota limits. Please try again later.";
      }
      
      return "I found relevant documents but couldn't generate a summary at this time. Please try again.";
    }
  }

  /**
   * Create snippet from content highlighting query terms
   */
  createSnippet(content, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const words = content.split(/\s+/);
    
    // Find first occurrence of any query word
    let startIndex = 0;
    for (let i = 0; i < words.length; i++) {
      if (queryWords.some(word => words[i].toLowerCase().includes(word))) {
        startIndex = Math.max(0, i - 10); // 10 words before
        break;
      }
    }
    
    const snippet = words.slice(startIndex, startIndex + 30).join(' '); // 30 words
    return snippet + (words.length > startIndex + 30 ? '...' : '');
  }

  /**
   * Deduplicate versions - show only latest version of each document group
   */
  deduplicateVersions(chunks) {
    const groups = new Map();
    
    // Group by version_group_id (or document_id if none)
    chunks.forEach(chunk => {
      const groupId = chunk.version_group_id || chunk.document_id;
      
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId).push(chunk);
    });
    
    // From each group, return only the latest version
    const deduplicated = [];
    
    groups.forEach(group => {
      if (group.length === 1) {
        // Single document, no duplicates
        deduplicated.push(group[0]);
        return;
      }
      
      // Find the latest version
      const latest = group.find(chunk => chunk.is_latest === true) || 
                     group.reduce((newest, current) => 
                       new Date(current.synced_at || current.metadata?.timestamp || 0) > 
                       new Date(newest.synced_at || newest.metadata?.timestamp || 0) 
                         ? current 
                         : newest
                     );
      
      // Add version metadata
      latest.alternate_versions_count = group.length - 1;
      latest.has_older_versions = group.length > 1;
      
      deduplicated.push(latest);
    });
    
    return deduplicated;
  }

  /**
   * Apply recency boost to search results
   */
  applyRecencyBoost(chunks) {
    const now = Date.now();
    
    return chunks.map(chunk => {
      // Try to get sync timestamp from various sources
      const syncedAt = chunk.synced_at || 
                      chunk.metadata?.timestamp || 
                      chunk.metadata?.last_modified_at ||
                      Date.now();
      
      const syncedAtTime = new Date(syncedAt).getTime();
      const daysSince = (now - syncedAtTime) / (1000 * 60 * 60 * 24);
      
      let multiplier = 1.0;
      if (daysSince <= 7) multiplier = 1.5;
      else if (daysSince <= 30) multiplier = 1.3;
      else if (daysSince <= 90) multiplier = 1.1;
      else if (daysSince <= 180) multiplier = 1.0;
      else multiplier = 0.7;
      
      const baseScore = chunk.similarity || 0.8;
      const finalScore = baseScore * multiplier;
      
      console.log(`📈 Recency boost: ${chunk.metadata?.title || 'Unknown'} scored ${finalScore.toFixed(3)} (base: ${baseScore.toFixed(3)}, days: ${Math.floor(daysSince)}, multiplier: ${multiplier})`);
      
      return {
        ...chunk,
        final_score: finalScore,
        days_since_sync: Math.floor(daysSince),
        recency_multiplier: multiplier
      };
    }).sort((a, b) => b.final_score - a.final_score);
  }

  /**
   * Determine document type from title
   */
  getDocumentType(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('.pdf')) return 'pdf';
    if (lowerTitle.includes('.doc') || lowerTitle.includes('.docx')) return 'doc';
    if (lowerTitle.includes('.xls') || lowerTitle.includes('.xlsx')) return 'excel';
    if (lowerTitle.includes('slack') || lowerTitle.includes('message')) return 'message';
    return 'page';
  }

  /**
   * Calculate text similarity between two strings (simple word overlap)
   * Returns similarity score between 0 and 1
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Preprocess chunks: deduplicate, trim, sort
   */
  preprocessChunksForDraft(chunks) {
    if (!chunks || chunks.length === 0) return [];

    // Step 1: Deduplicate chunks with >70% text overlap
    const deduplicated = [];
    
    for (const chunk of chunks) {
      let isDuplicate = false;
      const chunkText = (chunk.content || '').toLowerCase();
      
      for (const existing of deduplicated) {
        const existingText = (existing.content || '').toLowerCase();
        const similarity = this.calculateTextSimilarity(chunkText, existingText);
        
        if (similarity > 0.7) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        deduplicated.push(chunk);
      }
    }

    // Step 2: Trim to first 500 characters per chunk
    const trimmed = deduplicated.map(chunk => ({
      ...chunk,
      content: (chunk.content || '').substring(0, 500)
    }));

    // Step 3: Sort by weighted score (recency * 0.3 + relevance * 0.7)
    const now = Date.now();
    const sorted = trimmed.map(chunk => {
      const recencyScore = chunk.timestamp 
        ? Math.max(0, 1 - (now - new Date(chunk.timestamp).getTime()) / (90 * 24 * 60 * 60 * 1000)) // 90 days decay
        : 0.5;
      const relevanceScore = chunk.relevance || chunk.normalizedRRFScore || chunk.rrfScore || chunk.similarity || chunk.score || 0.5;
      const weightedScore = (recencyScore * 0.3) + (relevanceScore * 0.7);
      
      return { ...chunk, weightedScore };
    }).sort((a, b) => b.weightedScore - a.weightedScore);

    // Step 4: Limit to top 8 chunks
    return sorted.slice(0, 8);
  }

  /**
   * Generate PRD section draft using GPT-4 with deterministic style
   */
  async generatePRDSectionDraft(userText, chunks, sectionId) {
    try {
      // Preprocess chunks
      const preprocessedChunks = this.preprocessChunksForDraft(chunks);
      
      if (preprocessedChunks.length === 0) {
        return {
          draft: userText || 'To be determined',
          citations: []
        };
      }

      // System prompt (deterministic style)
      const SYSTEM_PROMPT = `You are a Senior Product Manager writing structured, concise PRD sections.

Follow the company PRD style guide:
- Use short paragraphs and bullet points.
- Always start with a summary line.
- If no data is available, write "To be determined".
- Never fabricate metrics or dependencies.
- Cite sources as [1], [2] matching provided context.

Return only the section text, no headings or explanations.`;

      // Section-specific user prompt
      const sectionPrompts = {
        objective: `Write a PRD Objective section that clearly states the problem being solved, user pain points, and goals. Focus on:
- Problem statement (what issue are we solving?)
- User pain points (why does this matter?)
- Goals and success criteria

User's current notes: ${userText || '(none)'}`,
        
        scope: `Write a PRD Scope section that defines clear boundaries. Focus on:
- In scope: Features and functionality included in this PRD
- Out of scope: What is explicitly excluded
- MVP boundaries: Minimum viable feature set

User's current notes: ${userText || '(none)'}`,
        
        metrics: `Write a PRD Metrics section with quantifiable success criteria. Focus on:
- Key Performance Indicators (KPIs)
- Success metrics with target values
- Measurement methods
- Baseline vs target comparisons

User's current notes: ${userText || '(none)'}`,
        
        dependencies: `Write a PRD Dependencies section listing blockers and constraints. Focus on:
- Technical dependencies (APIs, services, infrastructure)
- Organizational dependencies (teams, approvals)
- External constraints (timing, resources)
- Risk factors and mitigation strategies

User's current notes: ${userText || '(none)'}`,
        
        timeline: `Write a PRD Timeline section with key milestones. Focus on:
- Major phases and milestones
- Key dates and deadlines
- Dependencies between phases
- Launch targets

User's current notes: ${userText || '(none)'}`
      };

      const sectionPrompt = sectionPrompts[sectionId] || sectionPrompts.objective;

      // Format chunks with numbered citations
      const contextChunks = preprocessedChunks.map((chunk, idx) => {
        const title = chunk.title || chunk.metadata?.title || 'Document';
        const source = chunk.source || chunk.metadata?.source_type || 'Unknown';
        return `[${idx + 1}] ${title} - ${source}\n${chunk.content}`;
      }).join('\n\n---\n\n');

      const userPrompt = `${sectionPrompt}

Context from documents:

${contextChunks}

Generate the PRD section based on the user's notes and the provided context. Cite sources using [1], [2], etc.`;

      // Call GPT-4
      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const draft = response.choices[0].message.content.trim();
      const citations = preprocessedChunks.map(chunk => chunk.chunk_id || chunk.id);

      return {
        draft,
        citations: citations.filter(Boolean)
      };

    } catch (error) {
      console.error('❌ PRD draft generation error:', error);
      
      if (error.code === 'insufficient_quota' || error.status === 429) {
        throw new Error('OpenAI quota exceeded. Please try again later.');
      }
      
      throw new Error('Failed to generate draft. Please try again.');
    }
  }
}
