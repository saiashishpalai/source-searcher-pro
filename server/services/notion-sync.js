import { Client } from '@notionhq/client';
import OpenAI from 'openai';

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
   * Extract text from Notion blocks
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
   * Chunk text for embeddings with safety limits
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
   * Sync Notion pages for a user with SAFETY LIMITS
   */
  async syncNotion(userId, accessToken) {
    try {
      console.log(`🔄 Starting Notion sync for user ${userId} with safety limits`);
      console.log(`📊 Limits: Max ${this.SYNC_LIMITS.MAX_DOCUMENTS} pages, ${this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC} chunks/page`);

      // Initialize Notion client
      const notion = new Client({ auth: accessToken });
      
      console.log('✓ Notion client initialized, fetching pages...');

      // Search for all pages the integration has access to
      const searchResponse = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: this.SYNC_LIMITS.MAX_DOCUMENTS,
      });

      const pages = searchResponse.results;
      
      if (!pages || pages.length === 0) {
        console.log('⚠️ No Notion pages found');
        return {
          synced: 0,
          total: 0,
          message: 'No Notion pages found. Make sure the integration has access to pages.',
          details: []
        };
      }

      console.log(`📁 Found ${pages.length} Notion pages`);

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
          
          const text = this.extractTextFromBlocks(blocksResponse.results);
          
          if (!text || text.length < 50) {
            console.log(`  ⊘ Skipped (too short: ${text.length} chars)`);
            syncDetails.push({ 
              name: title, 
              status: 'skipped', 
              reason: 'Content too short' 
            });
            continue;
          }
          
          console.log(`  → Extracted ${text.length} characters`);
          
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
          
          // Process document into chunks and embeddings
          await this.processDocument(doc);
          
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

      console.log(`\n🎉 Notion sync complete: ${processedCount} of ${pages.length} pages processed`);
      
      return {
        synced: processedCount,
        total: pages.length,
        details: syncDetails,
        message: `Successfully synced ${processedCount} of ${pages.length} Notion pages`
      };

    } catch (error) {
      console.error('❌ Notion sync failed:', error);
      throw error;
    }
  }

  /**
   * Process document: chunk + generate embeddings
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
}

