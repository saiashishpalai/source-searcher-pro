import { google } from 'googleapis';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';

/**
 * DocumentSync - Handles document processing and embedding generation with SAFETY LIMITS
 */
export class DocumentSync {
  constructor(openaiApiKey) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.embeddingModel = 'text-embedding-3-small';
    
    // CRITICAL SAFETY LIMITS
    this.SYNC_LIMITS = {
      MAX_DOCUMENTS: 5,           // Only 5 docs for testing
      MAX_FILE_SIZE: 1000000,     // 1MB max per file
      MAX_CHUNKS_PER_DOC: 10,     // 10 chunks max
      MAX_TEXT_LENGTH: 15000,     // ~4000 tokens max
      CHUNK_SIZE: 1500,           // ~400 tokens
      CHUNK_OVERLAP: 200,         // Prevent sentence splitting
      STOP_AT_COST: 0.50          // Stop if cost exceeds $0.50
    };
  }

  /**
   * Sync Google Drive documents for a user with SAFETY LIMITS
   */
  async syncGoogleDrive(userId, accessToken, supabaseAdmin, progressCallback = null) {
    try {
      console.log(`🔄 Starting Google Drive sync for user ${userId} with safety limits`);
      console.log(`📊 Limits: Max ${this.SYNC_LIMITS.MAX_DOCUMENTS} docs, ${this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC} chunks/doc, $${this.SYNC_LIMITS.STOP_AT_COST} max cost`);

      // Setup Google Drive API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Test OAuth token first
      try {
        await drive.about.get({ fields: 'user' });
        console.log('✅ OAuth token is valid');
      } catch (authError) {
        console.error('❌ OAuth token invalid or expired:', authError.message);
        throw new Error('Google OAuth token expired. Please reconnect Google Drive.');
      }

      // List all files
      const response = await drive.files.list({
        pageSize: 100,
        fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, owners)',
        q: "trashed=false",
      });

      const files = response.data.files || [];
      console.log(`📁 Found ${files.length} files in Google Drive`);

      const processedDocs = [];
      let processedCount = 0;
      let totalCost = 0;

      for (const file of files) {
        // SAFETY CHECK #1: Document limit
        if (processedCount >= this.SYNC_LIMITS.MAX_DOCUMENTS) {
          console.log(`🛑 Safety limit reached: Processed ${processedCount}/${this.SYNC_LIMITS.MAX_DOCUMENTS} documents`);
          break;
        }

        // SAFETY CHECK #2: File size limit
        if (file.size && parseInt(file.size) > this.SYNC_LIMITS.MAX_FILE_SIZE) {
          console.log(`⏭️ Skipping ${file.name} - too large (${file.size} bytes)`);
          continue;
        }

        try {
          console.log(`📄 Processing document ${processedCount + 1}/${this.SYNC_LIMITS.MAX_DOCUMENTS}: ${file.name}`);
          const content = await this.extractFileContent(drive, file);
          
          if (!content) {
            console.log(`⏭️ Skipping ${file.name} - no text content`);
            continue;
          }

          // SAFETY CHECK #3: Cost estimation
          const estimatedTokens = content.length / 4; // Rough estimate
          const estimatedCost = (estimatedTokens / 1000000) * 0.10; // $0.10 per 1M tokens
          totalCost += estimatedCost;

          if (totalCost > this.SYNC_LIMITS.STOP_AT_COST) {
            console.log(`🛑 Safety limit reached: Estimated cost $${totalCost.toFixed(2)} > $${this.SYNC_LIMITS.STOP_AT_COST}`);
            break;
          }

          // Store document
          const { data: doc, error: docError } = await supabaseAdmin
            .from('documents')
            .upsert({
              user_id: userId,
              source_type: 'google_drive',
              source_id: file.id,
              title: file.name,
              content,
              url: file.webViewLink,
              author: file.owners?.[0]?.displayName || 'Unknown',
              mime_type: file.mimeType,
              file_size: parseInt(file.size) || 0,
              last_modified_at: file.modifiedTime,
              metadata: { owners: file.owners },
              synced_at: new Date().toISOString(),
            }, { onConflict: 'user_id,source_type,source_id' })
            .select()
            .single();

          if (docError) {
            console.error(`❌ Error storing document ${file.name}:`, docError);
            continue;
          }

          // Process document into chunks and embeddings
          await this.processDocument(doc, supabaseAdmin);
          processedDocs.push(doc);
          processedCount++;

          console.log(`✅ Processed: ${file.name} (${processedCount}/${this.SYNC_LIMITS.MAX_DOCUMENTS}) - Est. cost: $${totalCost.toFixed(3)}`);
          
          // Update progress callback if provided
          if (progressCallback) {
            progressCallback({
              status: 'processing',
              processedDocuments: processedCount,
              totalDocuments: this.SYNC_LIMITS.MAX_DOCUMENTS,
              currentDocument: file.name
            });
          }
        } catch (error) {
          console.error(`❌ Error processing ${file.name}:`, error);
        }
      }

      console.log(`🎉 Google Drive sync complete: ${processedDocs.length} documents processed, estimated cost: $${totalCost.toFixed(3)}`);
      return processedDocs;
    } catch (error) {
      console.error('❌ Google Drive sync failed:', error);
      throw error;
    }
  }

  /**
   * Extract text content from file with safety checks
   */
  async extractFileContent(drive, file) {
    try {
      // Google Docs
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const response = await drive.files.export({
          fileId: file.id,
          mimeType: 'text/plain',
        });
        return response.data;
      }

      // PDF
      if (file.mimeType === 'application/pdf') {
        const response = await drive.files.get({
          fileId: file.id,
          alt: 'media',
        }, { responseType: 'arraybuffer' });
        
        const buffer = Buffer.from(response.data);
        const data = await pdfParse.default(buffer);
        return data.text;
      }

      // Word documents
      if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const response = await drive.files.get({
          fileId: file.id,
          alt: 'media',
        }, { responseType: 'arraybuffer' });
        
        const buffer = Buffer.from(response.data);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }

      // Plain text
      if (file.mimeType === 'text/plain' || file.mimeType.startsWith('text/')) {
        const response = await drive.files.get({
          fileId: file.id,
          alt: 'media',
        });
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`Error extracting content from ${file.name}:`, error);
      return null;
    }
  }

  /**
   * Process document: chunk + generate embeddings with safety limits
   */
  async processDocument(document, supabaseAdmin) {
    try {
      // Delete existing chunks
      await supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', document.id);

      // SAFETY: Truncate content if too long
      let content = document.content;
      if (content.length > this.SYNC_LIMITS.MAX_TEXT_LENGTH) {
        content = content.slice(0, this.SYNC_LIMITS.MAX_TEXT_LENGTH);
        console.log(`✂️ Truncated ${document.title} - was ${document.content.length} chars, now ${content.length}`);
      }

      // Chunk the content
      const chunks = this.chunkText(content);
      console.log(`📝 Chunking ${document.title}: ${chunks.length} chunks`);

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
          console.log('⚠️ OpenAI quota exceeded, skipping embeddings for this batch');
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
      const { error } = await supabaseAdmin
        .from('document_chunks')
        .insert(chunkData);

      if (error) {
        console.error('Error inserting chunks:', error);
        throw error;
      }

      console.log(`🧠 Generated ${chunkData.length} embeddings for ${document.title}`);
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Smart text chunking with safety limits
   */
  chunkText(text) {
    const chunks = [];
    const CHUNK_SIZE = this.SYNC_LIMITS.CHUNK_SIZE;
    const OVERLAP = this.SYNC_LIMITS.CHUNK_OVERLAP;
    const MAX_CHUNKS = this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC;
    
    for (let i = 0; i < text.length; i += CHUNK_SIZE - OVERLAP) {
      // SAFETY: Stop at max chunks
      if (chunks.length >= MAX_CHUNKS) {
        console.log(`🛑 Chunk limit reached: ${chunks.length}/${MAX_CHUNKS} chunks`);
        break;
      }
      
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    return chunks.filter(c => c.length > 50); // Min 50 chars
  }
}
