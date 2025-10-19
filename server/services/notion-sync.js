import { Client } from '@notionhq/client';
import OpenAI from 'openai';
import { computeTfIdf, cosineSimilarity } from '../utils/document-similarity.js';

/**
 * NotionSync - Handles Notion document processing and embedding generation
 */
export class NotionSync {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.embeddingModel = 'text-embedding-3-small';
    
    // SAFETY LIMITS (matching Google Drive)
    this.SYNC_LIMITS = {
      MAX_DOCUMENTS: 10,           // 10 pages for testing
      MAX_TEXT_LENGTH: 15000,      // ~4000 tokens max
      MAX_CHUNKS_PER_DOC: 5,       // 5 chunks max
      CHUNK_SIZE: 1500,            // ~400 tokens
      CHUNK_OVERLAP: 200,          // Prevent sentence splitting
    };
  }

  /**
   * Generate TF-IDF content vector for document similarity
   */
  generateContentVector(content) {
    if (!content || typeof content !== 'string') {
      return {};
    }
    // Use first 10k chars for comparison
    const normalized = content.substring(0, 10000);
    return computeTfIdf(normalized);
  }

  /**
   * Find similar documents using TF-IDF cosine similarity
   */
  async findSimilarDocuments(contentVector, userId, currentSourceType) {
    // Query documents from OTHER sources (not current)
    const { data: allDocs } = await this.supabaseAdmin
      .from('documents')
      .select('id, title, source_type, metadata, synced_at')
      .eq('user_id', userId)
      .neq('source_type', currentSourceType);
    
    console.log(`🔍 TF-IDF: Checking ${allDocs?.length || 0} documents from other sources`);
    
    if (!allDocs || allDocs.length === 0) return [];
    
    const similar = [];
    
    for (const doc of allDocs) {
      const storedVector = doc.metadata?.content_vector;
      if (!storedVector) {
        console.log(`  ⚠️ Document "${doc.title}" has no content_vector`);
        continue;
      }
      
      // Calculate similarity (0 to 1 scale)
      const similarity = cosineSimilarity(contentVector, storedVector);
      console.log(`  📊 "${doc.title}" (${doc.source_type}): ${(similarity * 100).toFixed(1)}% similar`);
      
      // Threshold: 90% similarity = likely same document
      if (similarity >= 0.90) {
        console.log(`  ✅ MATCH FOUND: ${(similarity * 100).toFixed(1)}% similar!`);
        similar.push({
          document_id: doc.id,
          title: doc.title,
          source_type: doc.source_type,
          similarity_score: (similarity * 100).toFixed(1), // Percentage
          synced_at: doc.synced_at
        });
      }
    }
    
    if (similar.length > 0) {
      console.log(`🎯 Found ${similar.length} similar document(s)!`);
    } else {
      console.log(`❌ No similar documents found (threshold: 90%)`);
    }
    
    return similar;
  }

  /**
   * Extract text from Notion blocks (legacy method for backward compatibility)
   */
  extractTextFromBlocks(blocks) {
    let text = '';
    
    for (const block of blocks) {
      try {
        switch (block.type) {
          case 'paragraph':
            text += block.paragraph?.rich_text?.map(t => t.plain_text).join('') + '\n';
            break;
          case 'heading_1':
          case 'heading_2':
          case 'heading_3':
            const heading = block[block.type]?.rich_text?.map(t => t.plain_text).join('');
            text += `\n## ${heading}\n`;
            break;
          case 'bulleted_list_item':
          case 'numbered_list_item':
            const item = block[block.type]?.rich_text?.map(t => t.plain_text).join('');
            text += `- ${item}\n`;
            break;
          case 'code':
            const code = block.code?.rich_text?.map(t => t.plain_text).join('');
            text += `\`\`\`\n${code}\n\`\`\`\n`;
            break;
          case 'quote':
            const quote = block.quote?.rich_text?.map(t => t.plain_text).join('');
            text += `> ${quote}\n`;
            break;
          case 'to_do':
            const todo = block.to_do?.rich_text?.map(t => t.plain_text).join('');
            const checked = block.to_do?.checked ? '[x]' : '[ ]';
            text += `${checked} ${todo}\n`;
            break;
          case 'toggle':
            const toggle = block.toggle?.rich_text?.map(t => t.plain_text).join('');
            text += `${toggle}\n`;
            break;
          case 'callout':
            const callout = block.callout?.rich_text?.map(t => t.plain_text).join('');
            text += `> ${callout}\n`;
            break;
          default:
            // Skip unsupported block types (image, video, etc.)
            break;
        }
      } catch (error) {
        console.error(`Error extracting block type ${block.type}:`, error.message);
      }
    }
    
    return text.trim();
  }

  /**
   * Extract structured blocks with hierarchy for better chunking
   */
  extractBlocksWithHierarchy(blocks) {
    const structuredBlocks = [];
    let headingStack = []; // Track heading hierarchy (h1, h2, h3)
    
    for (const block of blocks) {
      try {
        const blockData = {
          type: block.type,
          id: block.id,
          content: '',
          headingHierarchy: [...headingStack], // Copy current heading stack
        };

        switch (block.type) {
          case 'paragraph':
            blockData.content = block.paragraph?.rich_text?.map(t => t.plain_text).join('') || '';
            break;
          case 'heading_1':
          case 'heading_2':
          case 'heading_3':
            const headingText = block[block.type]?.rich_text?.map(t => t.plain_text).join('') || '';
            blockData.content = headingText;
            
            // Update heading stack based on heading level
            const level = parseInt(block.type.split('_')[1]);
            headingStack = headingStack.slice(0, level - 1); // Remove deeper levels
            headingStack.push(headingText);
            blockData.headingHierarchy = [...headingStack];
            break;
          case 'bulleted_list_item':
          case 'numbered_list_item':
            const item = block[block.type]?.rich_text?.map(t => t.plain_text).join('') || '';
            blockData.content = `- ${item}`;
            break;
          case 'code':
            const code = block.code?.rich_text?.map(t => t.plain_text).join('') || '';
            blockData.content = `\`\`\`\n${code}\n\`\`\``;
            break;
          case 'quote':
            const quote = block.quote?.rich_text?.map(t => t.plain_text).join('') || '';
            blockData.content = `> ${quote}`;
            break;
          case 'to_do':
            const todo = block.to_do?.rich_text?.map(t => t.plain_text).join('') || '';
            const checked = block.to_do?.checked ? '[x]' : '[ ]';
            blockData.content = `${checked} ${todo}`;
            break;
          case 'toggle':
            const toggle = block.toggle?.rich_text?.map(t => t.plain_text).join('') || '';
            blockData.content = toggle;
            break;
          case 'callout':
            const callout = block.callout?.rich_text?.map(t => t.plain_text).join('') || '';
            blockData.content = `> ${callout}`;
            break;
          default:
            // Skip unsupported block types but still include in hierarchy
            continue;
        }

        if (blockData.content.trim()) {
          structuredBlocks.push(blockData);
        }
      } catch (error) {
        console.error(`Error extracting block type ${block.type}:`, error.message);
      }
    }
    
    return structuredBlocks;
  }

  /**
   * Get page title from Notion page object
   */
  getPageTitle(page) {
    try {
      // Try different title properties
      if (page.properties?.title?.title?.[0]?.plain_text) {
        return page.properties.title.title[0].plain_text;
      }
      if (page.properties?.Name?.title?.[0]?.plain_text) {
        return page.properties.Name.title[0].plain_text;
      }
      // Try other common title property names
      for (const key in page.properties) {
        if (page.properties[key].type === 'title' && page.properties[key].title?.[0]?.plain_text) {
          return page.properties[key].title[0].plain_text;
        }
      }
      return 'Untitled';
    } catch {
      return 'Untitled';
    }
  }

  /**
   * Chunk text for embeddings with safety limits (legacy method)
   */
  chunkText(text) {
    const chunks = [];
    const CHUNK_SIZE = this.SYNC_LIMITS.CHUNK_SIZE;
    const OVERLAP = this.SYNC_LIMITS.CHUNK_OVERLAP;
    const MAX_CHUNKS = this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC;
    
    // SAFETY: Truncate if too long
    if (text.length > this.SYNC_LIMITS.MAX_TEXT_LENGTH) {
      text = text.slice(0, this.SYNC_LIMITS.MAX_TEXT_LENGTH);
      console.log(`  ✂️ Truncated content to ${this.SYNC_LIMITS.MAX_TEXT_LENGTH} characters`);
    }
    
    for (let i = 0; i < text.length && chunks.length < MAX_CHUNKS; i += CHUNK_SIZE - OVERLAP) {
      const chunk = text.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 50) { // Min 50 chars
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Chunk by block hierarchy for better RAG results
   */
  chunkByHierarchy(structuredBlocks, pageTitle) {
    const chunks = [];
    const CHUNK_SIZE = 1000; // 800-1000 chars as specified
    const OVERLAP = 100; // Smaller overlap for hierarchical chunks
    const MAX_CHUNKS = this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC;
    
    let currentChunk = '';
    let currentHeading = null;
    let chunkStartIndex = 0;
    
    for (let i = 0; i < structuredBlocks.length; i++) {
      const block = structuredBlocks[i];
      
      // Check if this is a heading
      if (block.type.startsWith('heading_')) {
        currentHeading = block.content;
      }
      
      // Build chunk content with heading context
      let blockContent = block.content;
      if (currentHeading && !block.type.startsWith('heading_')) {
        // Include heading context for non-heading blocks
        blockContent = `## ${currentHeading}\n${blockContent}`;
      }
      
      const nextChunkLength = currentChunk.length + blockContent.length + 1; // +1 for newline
      
      // If adding this block would exceed chunk size, finalize current chunk
      if (nextChunkLength > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          headingHierarchy: this.getHeadingHierarchy(structuredBlocks, chunkStartIndex),
          blockType: this.getPrimaryBlockType(structuredBlocks, chunkStartIndex, i),
          parentPage: pageTitle
        });
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, OVERLAP);
        currentChunk = overlapText + blockContent + '\n';
        chunkStartIndex = i;
      } else {
        currentChunk += blockContent + '\n';
      }
      
      // SAFETY: Stop at max chunks
      if (chunks.length >= MAX_CHUNKS) {
        console.log(`🛑 Chunk limit reached: ${chunks.length}/${MAX_CHUNKS} chunks`);
        break;
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.trim().length > 50) {
      chunks.push({
        content: currentChunk.trim(),
        headingHierarchy: this.getHeadingHierarchy(structuredBlocks, chunkStartIndex),
        blockType: this.getPrimaryBlockType(structuredBlocks, chunkStartIndex, structuredBlocks.length),
        parentPage: pageTitle
      });
    }
    
    return chunks;
  }

  /**
   * Get heading hierarchy for a chunk
   */
  getHeadingHierarchy(structuredBlocks, startIndex) {
    const headingStack = [];
    let currentLevel = 0;
    
    // Look backwards from start index to find current heading context
    for (let i = Math.max(0, startIndex - 10); i < startIndex; i++) {
      const block = structuredBlocks[i];
      if (block.type.startsWith('heading_')) {
        const level = parseInt(block.type.split('_')[1]);
        
        // Remove deeper levels and add current heading
        headingStack.splice(level - 1);
        headingStack[level - 1] = block.content;
        currentLevel = level;
      }
    }
    
    return headingStack.filter(h => h).join(' > ');
  }

  /**
   * Get primary block type for a chunk
   */
  getPrimaryBlockType(structuredBlocks, startIndex, endIndex) {
    const blockTypes = new Set();
    
    for (let i = startIndex; i < endIndex; i++) {
      if (structuredBlocks[i]) {
        blockTypes.add(structuredBlocks[i].type);
      }
    }
    
    // Return most important block type
    if (blockTypes.has('heading_1')) return 'heading_1';
    if (blockTypes.has('heading_2')) return 'heading_2';
    if (blockTypes.has('heading_3')) return 'heading_3';
    if (blockTypes.has('code')) return 'code';
    if (blockTypes.has('quote')) return 'quote';
    if (blockTypes.has('bulleted_list_item')) return 'bulleted_list_item';
    if (blockTypes.has('numbered_list_item')) return 'numbered_list_item';
    
    return 'paragraph'; // Default
  }

  /**
   * Get overlap text from the end of current chunk
   */
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) {
      return text;
    }
    
    // Try to break at line boundary within overlap
    const overlapText = text.slice(-overlapSize);
    const lineBreak = overlapText.lastIndexOf('\n');
    
    if (lineBreak > overlapSize * 0.5) {
      return overlapText.slice(lineBreak + 1);
    }
    
    return overlapText;
  }

  /**
   * Get last sync timestamp for this user and source
   */
  async getLastSyncTimestamp(userId, sourceType) {
    const { data } = await this.supabaseAdmin
      .from('user_connections')
      .select('last_synced_at')
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .single();
    return data?.last_synced_at || null;
  }

  /**
   * Update last sync timestamp for this user and source
   */
  async updateLastSyncTimestamp(userId, sourceType) {
    await this.supabaseAdmin
      .from('user_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('source_type', sourceType);
  }

  /**
   * Sync Notion pages for a user with incremental sync
   */
  async syncNotion(userId, accessToken) {
    try {
      console.log(`🔄 Starting Notion incremental sync for user ${userId} with safety limits`);
      console.log(`📊 Limits: Max ${this.SYNC_LIMITS.MAX_DOCUMENTS} pages, ${this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC} chunks/page`);

      // Get last sync timestamp
      const lastSyncTimestamp = await this.getLastSyncTimestamp(userId, 'notion');
      console.log(`📅 Last sync: ${lastSyncTimestamp || 'Never'}`);

      // Initialize Notion client
      const notion = new Client({ auth: accessToken });
      
      console.log('✓ Notion client initialized, fetching pages...');

      // Search for pages with incremental filtering
      let searchResponse;
      if (lastSyncTimestamp) {
        // Only get pages edited since last sync
        console.log(`🔍 Fetching pages edited since ${lastSyncTimestamp}`);
        searchResponse = await notion.search({
          filter: { 
            property: 'object', 
            value: 'page'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: this.SYNC_LIMITS.MAX_DOCUMENTS,
        });
      } else {
        // First sync - get all pages
        console.log(`🔍 First sync - fetching all pages`);
        searchResponse = await notion.search({
          filter: { property: 'object', value: 'page' },
          page_size: this.SYNC_LIMITS.MAX_DOCUMENTS,
        });
      }

      let pages = searchResponse.results;
      
      if (!pages || pages.length === 0) {
        console.log('⚠️ No Notion pages found');
        return {
          synced: 0,
          total: 0,
          message: 'No Notion pages found. Make sure the integration has access to pages.',
          details: []
        };
      }

      // Filter pages by last_edited_time if this is an incremental sync
      if (lastSyncTimestamp) {
        const lastSyncDate = new Date(lastSyncTimestamp);
        const filteredPages = pages.filter(page => {
          const pageLastEdited = new Date(page.last_edited_time);
          return pageLastEdited > lastSyncDate;
        });
        
        console.log(`📁 Found ${pages.length} total pages, ${filteredPages.length} edited since last sync`);
        pages = filteredPages;
      } else {
        console.log(`📁 Found ${pages.length} Notion pages (first sync)`);
      }

      const processedDocs = [];
      const syncDetails = [];
      let processedCount = 0;

      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const title = this.getPageTitle(page);
        
        console.log(`\n📄 [${i + 1}/${pages.length}] Processing: ${title}`);
        
        try {
          // Get all blocks (content) from the page
          const blocksResponse = await notion.blocks.children.list({
            block_id: page.id,
            page_size: 100,
          });
          
          // Extract structured blocks with hierarchy
          const structuredBlocks = this.extractBlocksWithHierarchy(blocksResponse.results);
          
          if (structuredBlocks.length === 0) {
            console.log(`  ⊘ Skipped (no content blocks)`);
            syncDetails.push({ 
              name: title, 
              status: 'skipped', 
              reason: 'No content blocks' 
            });
            continue;
          }
          
          // Create text for document storage (legacy format for compatibility)
          const text = structuredBlocks.map(block => block.content).join('\n');
          
          if (!text || text.length < 50) {
            console.log(`  ⊘ Skipped (too short: ${text.length} chars)`);
            syncDetails.push({ 
              name: title, 
              status: 'skipped', 
              reason: 'Content too short' 
            });
            continue;
          }
          
          console.log(`  → Extracted ${text.length} characters from ${structuredBlocks.length} blocks`);
          
          // Generate TF-IDF content vector for similarity detection
          const contentVector = this.generateContentVector(text);
          const similar = await this.findSimilarDocuments(contentVector, userId, 'notion');
          
          // Store document
          const { data: doc, error: docError } = await this.supabaseAdmin
            .from('documents')
            .upsert({
              user_id: userId,
              source_type: 'notion',
              source_id: page.id,
              title,
              content: text,
              url: page.url,
              author: page.created_by?.id || 'Unknown',
              metadata: {
                created_time: page.created_time,
                last_edited_time: page.last_edited_time,
                icon: page.icon,
                cover: page.cover,
                // TF-IDF similarity detection
                content_vector: contentVector,
                similarity_method: 'tfidf-cosine',
                potential_duplicates: similar.length > 0 ? similar : null
              },
              last_modified_at: page.last_edited_time,
              synced_at: new Date().toISOString(),
            }, { onConflict: 'user_id,source_type,source_id' })
            .select()
            .single();
          
          if (docError) {
            console.error(`  ❌ Database error:`, docError);
            syncDetails.push({ 
              name: title, 
              status: 'failed', 
              reason: 'Database error' 
            });
            continue;
          }
          
          // Process document into chunks and embeddings with hierarchical chunking
          await this.processDocumentWithHierarchy(doc, structuredBlocks);
          
          processedDocs.push(doc);
          processedCount++;
          
          console.log(`  ✅ Synced successfully`);
          syncDetails.push({ 
            name: title, 
            status: 'success',
            chunks: doc.chunks_count || 0
          });
          
        } catch (error) {
          console.error(`  ❌ Failed to process ${title}:`, error.message);
          syncDetails.push({ 
            name: title, 
            status: 'failed', 
            reason: error.message 
          });
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId, 'notion');

      console.log(`\n🎉 Notion incremental sync complete: ${processedCount} of ${pages.length} pages processed`);
      
      // Calculate stats based on whether this was incremental or full sync
      const totalPagesFound = lastSyncTimestamp ? 
        (searchResponse.results?.length || 0) : 
        pages.length;
      const unchangedPages = totalPagesFound - processedCount;
      
      return {
        synced: processedCount,
        total: pages.length,
        details: syncDetails,
        message: `Successfully synced ${processedCount} of ${pages.length} Notion pages (incremental)`,
        // User-friendly incremental sync feedback
        incrementalStats: {
          totalPages: totalPagesFound,
          changedPages: processedCount,
          unchangedPages: unchangedPages,
          isIncremental: lastSyncTimestamp !== null,
          efficiencyMessage: lastSyncTimestamp !== null
            ? `Smart sync: Only ${processedCount} of ${totalPagesFound} pages were edited since last sync (${Math.round((unchangedPages / totalPagesFound) * 100)}% were unchanged)`
            : `Full sync: All ${pages.length} pages were processed`
        }
      };

    } catch (error) {
      console.error('❌ Notion sync failed:', error);
      throw error;
    }
  }

  /**
   * Process document: chunk + generate embeddings (legacy method)
   */
  async processDocument(document) {
    try {
      // Delete existing chunks
      await this.supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', document.id);

      // Chunk the content
      const chunks = this.chunkText(document.content);
      console.log(`  📝 Created ${chunks.length} chunks`);

      if (chunks.length === 0) {
        console.log(`  ⚠️ No chunks created for ${document.title}`);
        return;
      }

      // Generate embeddings in batches
      const batchSize = 20;
      const chunkData = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        let embeddings;
        try {
          const response = await this.openai.embeddings.create({
            model: this.embeddingModel,
            input: batch,
          });
          embeddings = response.data.map(d => d.embedding);
        } catch (error) {
          if (error.code === 'insufficient_quota' || error.status === 429) {
            console.log('  ⚠️ OpenAI quota exceeded, skipping embeddings for this batch');
            embeddings = new Array(batch.length).fill(null);
          } else {
            throw error;
          }
        }

        // Prepare chunk data
        for (let j = 0; j < batch.length; j++) {
          chunkData.push({
            document_id: document.id,
            user_id: document.user_id,
            chunk_index: i + j,
            content: batch[j],
            token_count: Math.ceil(batch[j].length / 4),
            embedding: embeddings[j],
            metadata: {
              source_type: document.source_type,
              title: document.title,
              url: document.url,
              author: document.author,
            },
          });
        }
      }

      // Insert chunks
      const { error } = await this.supabaseAdmin
        .from('document_chunks')
        .insert(chunkData);

      if (error) {
        console.error('  ❌ Error inserting chunks:', error);
        throw error;
      }

      console.log(`  🧠 Generated ${chunkData.length} embeddings`);
    } catch (error) {
      console.error('  ❌ Error processing document:', error);
      throw error;
    }
  }

  /**
   * Process document with hierarchical chunking: chunk + generate embeddings
   */
  async processDocumentWithHierarchy(document, structuredBlocks) {
    try {
      // Delete existing chunks
      await this.supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', document.id);

      // Chunk the content using hierarchical chunking
      const chunkObjects = this.chunkByHierarchy(structuredBlocks, document.title);
      console.log(`  📝 Created ${chunkObjects.length} hierarchical chunks`);

      if (chunkObjects.length === 0) {
        console.log(`  ⚠️ No chunks created for ${document.title}`);
        return;
      }

      // Generate embeddings in batches
      const batchSize = 20;
      const chunkData = [];

      for (let i = 0; i < chunkObjects.length; i += batchSize) {
        const batch = chunkObjects.slice(i, i + batchSize);
        const batchContent = batch.map(chunk => chunk.content);
        
        let embeddings;
        try {
          const response = await this.openai.embeddings.create({
            model: this.embeddingModel,
            input: batchContent,
          });
          embeddings = response.data.map(d => d.embedding);
        } catch (error) {
          if (error.code === 'insufficient_quota' || error.status === 429) {
            console.log('  ⚠️ OpenAI quota exceeded, skipping embeddings for this batch');
            embeddings = new Array(batch.length).fill(null);
          } else {
            throw error;
          }
        }

        // Prepare chunk data with enhanced metadata
        for (let j = 0; j < batch.length; j++) {
          const chunkObj = batch[j];
          
          chunkData.push({
            document_id: document.id,
            user_id: document.user_id,
            chunk_index: i + j,
            content: chunkObj.content,
            token_count: Math.ceil(chunkObj.content.length / 4),
            embedding: embeddings[j],
            metadata: {
              source_type: document.source_type,
              title: document.title,
              url: document.url,
              author: document.author,
              // Enhanced metadata for Notion
              block_type: chunkObj.blockType,
              heading_hierarchy: chunkObj.headingHierarchy,
              parent_page: chunkObj.parentPage,
            },
          });
        }
      }

      // Insert chunks
      const { error } = await this.supabaseAdmin
        .from('document_chunks')
        .insert(chunkData);

      if (error) {
        console.error('  ❌ Error inserting chunks:', error);
        throw error;
      }

      console.log(`  🧠 Generated ${chunkData.length} embeddings with hierarchical metadata`);
    } catch (error) {
      console.error('  ❌ Error processing document with hierarchy:', error);
      throw error;
    }
  }
}

