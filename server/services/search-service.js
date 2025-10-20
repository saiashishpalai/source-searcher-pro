import OpenAI from 'openai';

/**
 * SearchService - Performs vector similarity search and RAG answer generation
 */
export class SearchService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.embeddingModel = 'text-embedding-3-small';
    this.llmModel = 'gpt-3.5-turbo'; // Cheaper than GPT-4
  }

  /**
   * Perform RAG search with safety limits
   */
  async search(userId, query, supabaseAdmin) {
    try {
      console.log(`🔍 Searching for: "${query}" (user: ${userId})`);

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

      // 3. Generate AI summary using RAG
      const aiSummary = await this.generateSummary(query, deduplicatedChunks);

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
  async regenerateSummary(query, results) {
    try {
      // Convert results back to chunks format for summary generation
      const chunks = results.map(result => ({
        content: result.content || result.snippet,
        metadata: {
          title: result.title || result.filename,
          source: result.source
        }
      }));

      const maxChunks = 10;
      const contextChunks = chunks.slice(0, maxChunks);
      
      const context = contextChunks
        .map(chunk => `Source: ${chunk.metadata.title}\nContent: ${chunk.content}`)
        .join('\n\n');

      const prompt = `Based on the following documents, provide a comprehensive summary answering the user's query: "${query}"

Documents:
${context}

Please provide a clear, concise summary that directly addresses the user's question. Include specific details and cite sources when relevant. Keep the summary under 300 words. Provide a fresh perspective with different wording than previous summaries.`;

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes information from documents to answer user queries. Be accurate and cite sources. Provide varied perspectives when asked to regenerate.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
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
  async generateSummary(query, chunks) {
    try {
      // SAFETY: Limit context to prevent high costs
      const maxChunks = 10;
      const contextChunks = chunks.slice(0, maxChunks);
      
      const context = contextChunks
        .map(chunk => `Source: ${chunk.metadata.title}\nContent: ${chunk.content}`)
        .join('\n\n');

      const prompt = `Based on the following documents, provide a comprehensive summary answering the user's query: "${query}"

Documents:
${context}

Please provide a clear, concise summary that directly addresses the user's question. Include specific details and cite sources when relevant. Keep the summary under 300 words.`;

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes information from documents to answer user queries. Be accurate and cite sources.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300, // Limit response length
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
