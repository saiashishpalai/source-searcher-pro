import { google } from 'googleapis';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';

/**
 * GoogleDriveSync - Handles Google Drive document processing with incremental sync
 */
export class GoogleDriveSync {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.embeddingModel = 'text-embedding-3-small';
    
    // SAFETY LIMITS
    this.SYNC_LIMITS = {
      MAX_DOCUMENTS: 5,           // Only 5 docs for testing
      MAX_FILE_SIZE: 1000000,     // 1MB max per file
      MAX_CHUNKS_PER_DOC: 10,      // 10 chunks max
      MAX_TEXT_LENGTH: 15000,      // ~4000 tokens max
      CHUNK_SIZE: 1500,            // ~400 tokens
      CHUNK_OVERLAP: 200,          // Prevent sentence splitting
      STOP_AT_COST: 0.50           // Stop if cost exceeds $0.50
    };
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
   * Check if file has changed by comparing revision IDs
   */
  async hasFileChanged(drive, fileId, storedRevisionId) {
    try {
      const revisions = await drive.files.revisions.list({ fileId });
      const latestRevision = revisions.data.revisions[revisions.data.revisions.length - 1];
      
      if (!latestRevision) {
        console.log(`  ⚠️ No revisions found for file ${fileId}`);
        return true; // Assume changed if no revisions
      }
      
      const currentRevisionId = latestRevision.id;
      const hasChanged = storedRevisionId !== currentRevisionId;
      
      console.log(`  🔍 Revision check: stored=${storedRevisionId}, current=${currentRevisionId}, changed=${hasChanged}`);
      return hasChanged;
    } catch (error) {
      console.error(`  ❌ Error checking revisions for file ${fileId}:`, error.message);
      return true; // Assume changed on error
    }
  }

  /**
   * Get current revision info for a file
   */
  async getCurrentRevisionInfo(drive, fileId) {
    try {
      const revisions = await drive.files.revisions.list({ fileId });
      const latestRevision = revisions.data.revisions[revisions.data.revisions.length - 1];
      
      if (!latestRevision) {
        return null;
      }
      
      return {
        revision_id: latestRevision.id,
        modified_time: latestRevision.modifiedTime,
        revision_count: revisions.data.revisions.length
      };
    } catch (error) {
      console.error(`  ❌ Error getting revision info for file ${fileId}:`, error.message);
      return null;
    }
  }

  /**
   * Sync Google Drive documents for a user with incremental sync
   */
  async syncGoogleDrive(userId, accessToken, progressCallback = null) {
    try {
      console.log(`🔄 Starting Google Drive incremental sync for user ${userId}`);
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
        throw new Error('invalid authentication');
      }

      // Get last sync timestamp
      const lastSyncTimestamp = await this.getLastSyncTimestamp(userId, 'google_drive');
      console.log(`📅 Last sync: ${lastSyncTimestamp || 'Never'}`);

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
      let skippedCount = 0;
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
          
          // Check if document already exists in database
          const { data: existingDoc } = await this.supabaseAdmin
            .from('documents')
            .select('id, metadata')
            .eq('user_id', userId)
            .eq('source_type', 'google_drive')
            .eq('source_id', file.id)
            .single();

          if (existingDoc) {
            // Check if file has changed using revision ID
            const storedRevisionId = existingDoc.metadata?.revision_id;
            const hasChanged = await this.hasFileChanged(drive, file.id, storedRevisionId);
            
            if (!hasChanged) {
              console.log(`  ✅ File ${file.name} unchanged, skipping (revision ${storedRevisionId})`);
              skippedCount++;
              continue;
            }
            
            console.log(`  🔄 File ${file.name} changed (old: ${storedRevisionId}), syncing`);
          } else {
            console.log(`  🆕 New file ${file.name}, syncing`);
          }

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

          // Get current revision info
          const revisionInfo = await this.getCurrentRevisionInfo(drive, file.id);

          // Store document with revision metadata
          const { data: doc, error: docError } = await this.supabaseAdmin
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
              metadata: { 
                owners: file.owners,
                revision_id: revisionInfo?.revision_id,
                modified_time: revisionInfo?.modified_time,
                revision_count: revisionInfo?.revision_count
              },
              synced_at: new Date().toISOString(),
            }, { onConflict: 'user_id,source_type,source_id' })
            .select()
            .single();

          if (docError) {
            console.error(`❌ Error storing document ${file.name}:`, docError);
            continue;
          }

          // Process document into chunks and embeddings
          await this.processDocument(doc);
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

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId, 'google_drive');

      console.log(`🎉 Google Drive incremental sync complete: ${processedDocs.length} documents processed, ${skippedCount} skipped, estimated cost: $${totalCost.toFixed(3)}`);
      return {
        synced: processedDocs.length,
        skipped: skippedCount,
        total: files.length,
        details: processedDocs,
        message: `Successfully synced ${processedDocs.length} documents, skipped ${skippedCount} unchanged files`,
        // User-friendly incremental sync feedback
        incrementalStats: {
          totalFiles: files.length,
          changedFiles: processedDocs.length,
          unchangedFiles: skippedCount,
          isIncremental: skippedCount > 0,
          efficiencyMessage: skippedCount > 0 
            ? `Smart sync: Only ${processedDocs.length} of ${files.length} files needed updates (${Math.round((skippedCount / files.length) * 100)}% were unchanged)`
            : `Full sync: All ${files.length} files were processed`
        }
      };
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
  async processDocument(document) {
    try {
      // Delete existing chunks
      await this.supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', document.id);

      // SAFETY: Truncate content if too long
      let content = document.content;
      if (content.length > this.SYNC_LIMITS.MAX_TEXT_LENGTH) {
        content = content.slice(0, this.SYNC_LIMITS.MAX_TEXT_LENGTH);
        console.log(`✂️ Truncated ${document.title} - was ${document.content.length} chars, now ${content.length}`);
      }

      // Chunk the content using smart sentence-boundary chunking
      const chunkObjects = this.chunkTextSmart(content, document.mime_type);
      console.log(`📝 Smart chunking ${document.title}: ${chunkObjects.length} chunks`);

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
            console.log('⚠️ OpenAI quota exceeded, skipping embeddings for this batch');
            embeddings = new Array(batch.length).fill(null);
          } else {
            throw error;
          }
        }

        // Prepare chunk data with enhanced metadata
        for (let j = 0; j < batch.length; j++) {
          const chunkObj = batch[j];
          const estimatedPageNumber = Math.floor(chunkObj.startPos / 3000) + 1; // ~3000 chars per page
          
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
              // Enhanced metadata for Google Drive
              page_number: estimatedPageNumber,
              section_heading: chunkObj.sectionHeading,
              file_type: chunkObj.fileType,
            },
          });
        }
      }

      // Insert chunks
      const { error } = await this.supabaseAdmin
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
   * Smart sentence-boundary chunking for better RAG results
   */
  chunkTextSmart(text, fileType) {
    const chunks = [];
    const CHUNK_SIZE = 1200; // 1000-1200 chars as specified
    const OVERLAP = 150; // 150 chars overlap
    const MAX_CHUNKS = this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC;
    
    // Split text into sentences first
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkStartPos = 0;
    let sectionHeading = this.extractSectionHeading(text, 0);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const nextChunkLength = currentChunk.length + sentence.length;
      
      // If adding this sentence would exceed chunk size, finalize current chunk
      if (nextChunkLength > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          startPos: chunkStartPos,
          sectionHeading: sectionHeading,
          fileType: this.getFileTypeFromMimeType(fileType)
        });
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, OVERLAP);
        currentChunk = overlapText + sentence;
        chunkStartPos = chunkStartPos + currentChunk.length - overlapText.length;
        
        // Update section heading for new chunk
        sectionHeading = this.extractSectionHeading(text, chunkStartPos);
        
        // SAFETY: Stop at max chunks
        if (chunks.length >= MAX_CHUNKS) {
          console.log(`🛑 Chunk limit reached: ${chunks.length}/${MAX_CHUNKS} chunks`);
          break;
        }
      } else {
        currentChunk += sentence;
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.trim().length > 50) {
      chunks.push({
        content: currentChunk.trim(),
        startPos: chunkStartPos,
        sectionHeading: sectionHeading,
        fileType: this.getFileTypeFromMimeType(fileType)
      });
    }
    
    return chunks;
  }

  /**
   * Split text into sentences while preserving sentence boundaries
   */
  splitIntoSentences(text) {
    // Regex to split on sentence boundaries (. ! ?) followed by space or newline
    const sentenceRegex = /([.!?])\s+/g;
    const sentences = [];
    
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentenceEnd = match.index + 1;
      const sentence = text.slice(lastIndex, sentenceEnd).trim();
      if (sentence.length > 0) {
        sentences.push(sentence + ' ');
      }
      lastIndex = sentenceEnd + 1;
    }
    
    // Add remaining text as final sentence
    const remaining = text.slice(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining + ' ');
    }
    
    return sentences;
  }

  /**
   * Extract section heading near the given position
   */
  extractSectionHeading(text, position) {
    const lines = text.split('\n');
    const targetLineIndex = Math.floor(position / (text.length / lines.length));
    
    // Look backwards from target position for heading patterns
    for (let i = Math.max(0, targetLineIndex - 5); i <= Math.min(lines.length - 1, targetLineIndex + 2); i++) {
      const line = lines[i].trim();
      
      // Check for markdown headers
      if (line.match(/^#{1,6}\s+/)) {
        return line.replace(/^#{1,6}\s+/, '');
      }
      
      // Check for lines ending with colon (common heading pattern)
      if (line.match(/^[A-Z][^.!?]*:$/) && line.length < 100) {
        return line.replace(':', '');
      }
      
      // Check for all caps lines (common heading pattern)
      if (line.match(/^[A-Z\s]{3,}$/) && line.length < 50 && line.length > 3) {
        return line;
      }
    }
    
    return null;
  }

  /**
   * Get overlap text from the end of current chunk
   */
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) {
      return text;
    }
    
    // Try to break at sentence boundary within overlap
    const overlapText = text.slice(-overlapSize);
    const sentenceEnd = overlapText.lastIndexOf('.');
    
    if (sentenceEnd > overlapSize * 0.5) {
      return overlapText.slice(sentenceEnd + 1).trim() + ' ';
    }
    
    return overlapText;
  }

  /**
   * Convert mime type to readable file type
   */
  getFileTypeFromMimeType(mimeType) {
    if (!mimeType) return 'document';
    
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word Document';
    if (mimeType.startsWith('text/')) return 'Text File';
    
    return 'Document';
  }
}
