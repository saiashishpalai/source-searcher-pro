import OpenAI from 'openai';

/**
 * SearchService - Performs vector similarity search and RAG answer generation
 */
export class SearchService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.embeddingModel = 'text-embedding-3-small';
    this.llmModel = 'gpt-4o-mini'; // Upgraded for better reasoning
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
    const prompts = {
      strategic: `You are answering questions about decisions and reasoning from the user's documents.

Format your response EXACTLY like this:

**Answer:** [Write 1-2 complete sentences as a single paragraph. Do NOT use bullets here.]

**Reasoning:** [Write 2-3 complete sentences explaining why. Do NOT use bullets here. Write as flowing paragraphs.]

**Supporting Details:**
- [First supporting fact as a complete sentence]
- [Second supporting fact as a complete sentence]
- [Third supporting fact as a complete sentence]

**Source:** [Document name]

Rules:
- Only use bullet points in the "Supporting Details" section
- All other sections must be complete paragraphs without bullets
- Do not break sentences across lines
- Do not insert bullets in the middle of compound words or hyphenated phrases
- Each bullet must be a complete, standalone sentence
- Keep total response under 300 words`,

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

      general: `You are a direct, no-bullshit search assistant.

Format your response EXACTLY like this:

**Answer:** [Write the answer as 1-2 complete sentences in paragraph form. No bullets.]

**Found in:** [Source type - Document name]

**Details:**
- [First detail as a complete sentence]
- [Second detail as a complete sentence]  
- [Third detail as a complete sentence]

Rules:
- Only use bullets in the "Details" section
- The "Answer" section must be a complete paragraph with NO bullets
- Do not break sentences mid-word
- Each bullet must be a complete sentence starting with a capital letter
- Do not use bullets for compound words (e.g., "post-signup" stays as one phrase)
- Keep response under 200 words`
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
   * Perform RAG search with safety limits
   */
  async search(userId, query, supabaseAdmin) {
    try {
      console.log(`🔍 Searching for: "${query}" (user: ${userId})`);

      // Classify query type for tailored processing
      const queryClassification = this.classifyQuery(query);
      const queryType = queryClassification.type;
      console.log(`📊 Query classified as: ${queryType} (boost terms: ${queryClassification.boostTerms.length})`);

      // 1. Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // 2. First, check if there are any chunks with embeddings
      const { data: allChunks, error: checkError } = await supabaseAdmin
        .from('document_chunks')
        .select('id, metadata, embedding')
        .eq('user_id', userId)
        .not('embedding', 'is', null)
        .limit(50);  // Higher limit to see all sources
      
      const sourceCounts = {};
      allChunks?.forEach(c => {
        const src = c.metadata?.source_type || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      
      console.log('📊 Embedding check:', {
        totalChunksWithEmbeddings: allChunks?.length || 0,
        bySource: sourceCounts
      });

      // 3. Vector similarity search using Supabase RPC function
      console.log('🔍 Using vector similarity search across all sources...');
      let { data: chunks, error } = await supabaseAdmin
        .rpc('search_document_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.3,  // Much lower threshold for better recall
          match_count: 20,        // More results
          user_id_param: userId
        });

      console.log('🔍 Vector search response:', { 
        hasError: !!error, 
        hasData: !!chunks, 
        chunkCount: chunks?.length || 0,
        errorDetails: error || 'none'
      });

      if (error) {
        console.error('❌ Vector search RPC error:', error);
        console.log('⚠️ Falling back to text search...');
        
        // Fallback to text search if vector search fails
        const { data: textChunks, error: textError } = await supabaseAdmin
          .from('document_chunks')
          .select(`
            id,
            document_id,
            content,
            chunk_index,
            metadata
          `)
          .eq('user_id', userId)
          .ilike('content', `%${query}%`)
          .limit(10);
        
        if (textError || !textChunks || textChunks.length === 0) {
          console.log('❌ No relevant documents found (text search also failed)');
          return {
            query,
            results: [],
            aiSummary: "No relevant documents found for your search. Try different keywords or check if documents have been synced.",
            totalResults: 0,
            searchTime: 0,
            timestamp: new Date().toISOString(),
          };
        }
        
        // Use text search results
        chunks = textChunks;
        console.log(`📊 Found ${chunks.length} relevant chunks (text search fallback)`);
      }

      // If vector search returns no results, fall back to text search
      if (!chunks || chunks.length === 0) {
        console.log('⚠️ Vector search returned 0 results, falling back to text search...');
        
        const { data: textChunks, error: textError } = await supabaseAdmin
          .from('document_chunks')
          .select(`
            id,
            document_id,
            content,
            chunk_index,
            metadata
          `)
          .eq('user_id', userId)
          .ilike('content', `%${query}%`)
          .limit(10);
        
        if (!textChunks || textChunks.length === 0) {
          console.log('❌ No relevant documents found (both vector and text search failed)');
          return {
            query,
            results: [],
            aiSummary: "No relevant documents found for your search. Try different keywords or check if documents have been synced.",
            totalResults: 0,
            searchTime: 0,
            timestamp: new Date().toISOString(),
          };
        }
        
        chunks = textChunks;
        console.log(`📊 Found ${chunks.length} relevant chunks (text search fallback)`);
      }

      console.log(`📊 Found ${chunks.length} relevant chunks (vector similarity search)`);

      // Re-rank chunks based on boost terms if available
      if (queryClassification.boostTerms.length > 0) {
        chunks = this.reRankChunks(chunks, queryClassification.boostTerms);
        console.log(`🔄 Re-ranked chunks using boost terms: ${queryClassification.boostTerms.slice(0, 3).join(', ')}...`);
      }

      // Log sources of results
      const sources = [...new Set(chunks.map(c => c.metadata?.source_type))];
      console.log(`📁 Results from sources: ${sources.join(', ')}`);

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

      // Apply recency boost to search results
      const boostedChunks = this.applyRecencyBoost(chunks);
      console.log(`📈 Applied recency boost to ${boostedChunks.length} chunks`);

      // Deduplicate versions - show only latest version of each document group
      const deduplicatedChunks = this.deduplicateVersions(boostedChunks);
      console.log(`🔄 Deduplicated versions: ${boostedChunks.length} → ${deduplicatedChunks.length} chunks`);

      // 3. Generate AI summary using RAG with query-type-specific prompt
      const aiSummary = await this.generateSummary(query, deduplicatedChunks, queryType);

      // 4. Format results
      const results = deduplicatedChunks.map(chunk => {
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

      const searchTime = Math.floor(Math.random() * 500 + 200); // Simulate search time

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
  async regenerateSummary(query, results, queryType = 'general') {
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

      const maxChunks = 10;
      const contextChunks = chunks.slice(0, maxChunks);
      
      // Enhanced context formatting with separators
      const context = contextChunks
        .map(chunk => {
          const sourceType = chunk.metadata?.source_type || 'unknown';
          const title = chunk.metadata?.title || 'Unknown Document';
          return `Source: ${sourceType} - ${title}\nContent: ${chunk.content}`;
        })
        .join('\n\n---\n\n');

      const prompt = `User's question: "${query}"

Documents found:
${context}

Answer the question using the format specified. Only use information from the documents. If you can't answer from these documents, say 'Not found in your documents.'`;

      // Get system prompt for this query type
      const systemPrompt = this.getSystemPrompt(queryType);

      // Token limits by query type
      const tokenLimits = {
        strategic: 600,
        status: 500,
        client_context: 500,
        comparison: 550,
        metrics: 400,
        process: 500,
        definition: 350,
        timeline: 500,
        problem: 500,
        recommendation: 550,
        meeting: 500,
        risk: 500,
        ownership: 350,
        historical: 500,
        enumeration: 500,
        general: 400
      };
      const maxTokens = tokenLimits[queryType] || 400;

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.7, // Higher temperature for more variation in regeneration
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error regenerating summary:', error);
      
      if (error.code === 'insufficient_quota' || error.status === 429) {
        console.log('⚠️ OpenAI quota exceeded for summary regeneration');
        throw new Error('OpenAI quota exceeded');
      }
      
      return "I couldn't regenerate the summary at this time. Please try again.";
    }
  }

  /**
   * Generate AI summary using RAG with safety limits
   */
  async generateSummary(query, chunks, queryType = 'general') {
    try {
      // SAFETY: Limit context to prevent high costs
      const maxChunks = 10;
      const contextChunks = chunks.slice(0, maxChunks);
      
      // Enhanced context formatting with separators
      const context = contextChunks
        .map(chunk => {
          const sourceType = chunk.metadata?.source_type || 'unknown';
          const title = chunk.metadata?.title || 'Unknown Document';
          return `Source: ${sourceType} - ${title}\nContent: ${chunk.content}`;
        })
        .join('\n\n---\n\n');

      const prompt = `User's question: "${query}"

Documents found:
${context}

Answer the question using the format specified. Only use information from the documents. If you can't answer from these documents, say 'Not found in your documents.'`;

      // Get system prompt for this query type
      const systemPrompt = this.getSystemPrompt(queryType);

      // Token limits by query type
      const tokenLimits = {
        strategic: 600,
        status: 500,
        client_context: 500,
        comparison: 550,
        metrics: 400,
        process: 500,
        definition: 350,
        timeline: 500,
        problem: 500,
        recommendation: 550,
        meeting: 500,
        risk: 500,
        ownership: 350,
        historical: 500,
        enumeration: 500,
        general: 400
      };
      const maxTokens = tokenLimits[queryType] || 400;

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // Reduce randomness for accuracy
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating summary:', error);
      
      // Handle quota exceeded gracefully
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
}
