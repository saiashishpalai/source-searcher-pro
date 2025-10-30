import { google } from 'googleapis';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import OpenAI from 'openai';
import { computeTfIdf, cosineSimilarity } from '../utils/document-similarity.js';
import { pdfParser } from './pdf-parser.js';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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
      MAX_DOCUMENTS: parseInt(process.env.MAX_GOOGLE_DRIVE_FILES) || 200,  // 200 document limit
      MAX_FILE_SIZE: 1000000,     // 1MB max per file
      MAX_CHUNKS_PER_DOC: parseInt(process.env.MAX_CHUNKS_PER_DOCUMENT) || 10,  // 10 chunks max
      MAX_TEXT_LENGTH: 15000,      // ~4000 tokens max
      CHUNK_SIZE: 1500,            // ~400 tokens
      CHUNK_OVERLAP: 200,          // Prevent sentence splitting
      STOP_AT_COST: 0.50           // Stop if cost exceeds $0.50
    };

    this.INCREMENTAL_CONFIG = {
      FULL_SYNC_INTERVAL_DAYS: 30,
      INCREMENTAL_LOOKBACK_DAYS: 7,
      BATCH_SIZE: 5
    };
  }

  async getSyncMetadata(userId) {
    const { data } = await this.supabaseAdmin
      .from('sync_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'google_drive')
      .single();
    return data || null;
  }

  async updateSyncMetadata(userId, updates) {
    await this.supabaseAdmin
      .from('sync_metadata')
      .upsert({
        user_id: userId,
        source_type: 'google_drive',
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,source_type' });
  }

  determineSyncType(lastSync, lastFullSync) {
    if (!lastSync) return 'full';
    if (lastFullSync) {
      const days = (Date.now() - new Date(lastFullSync).getTime()) / (1000*60*60*24);
      if (days > this.INCREMENTAL_CONFIG.FULL_SYNC_INTERVAL_DAYS) return 'full';
    }
    return 'incremental';
  }

  async listFilesOptimized(drive, accessToken, syncType, lastSyncAt) {
    const files = [];
    let pageToken = null;
    const lookbackMs = this.INCREMENTAL_CONFIG.INCREMENTAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    let query = "trashed=false";
    if (syncType === 'incremental' && lastSyncAt) {
      const lookback = new Date(new Date(lastSyncAt).getTime() - lookbackMs).toISOString();
      query += ` and modifiedTime > '${lookback}'`;
      console.log(`   🔍 Filtering modifiedTime > ${lookback}`);
    }
    do {
      const response = await drive.files.list({
        pageSize: 100,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, owners, md5Checksum)',
        q: query,
        orderBy: 'modifiedTime desc',
        pageToken
      });
      const batch = response.data.files || [];
      files.push(...batch);
      pageToken = response.data.nextPageToken;
      console.log(`📄 Page fetched: +${batch.length}, total=${files.length}${pageToken ? ', hasNext' : ''}`);
      if (files.length >= this.SYNC_LIMITS.MAX_DOCUMENTS) break;
    } while (pageToken);

    return files.slice(0, this.SYNC_LIMITS.MAX_DOCUMENTS);
  }

  async getExistingDocumentHashes(userId) {
    const { data } = await this.supabaseAdmin
      .from('documents')
      .select('id, source_id, content_hash, last_modified_at, content')
      .eq('user_id', userId)
      .eq('source_type', 'google_drive')
      .eq('is_deleted', false);
    const map = new Map();
    for (const d of (data || [])) {
      map.set(d.source_id, { id: d.id, hash: d.content_hash, modified: d.last_modified_at, content: d.content });
    }
    return map;
  }

  needsProcessing(file, existingDoc) {
    if (!existingDoc) return { needs: true, reason: 'new_file' };
    const content = existingDoc.content || '';
    const isPlaceholder = content.includes('PDF text extraction is temporarily disabled') ||
                          content.includes('PDF text extraction is not yet implemented') ||
                          content.length < 50;
    if (isPlaceholder && file.mimeType === 'application/pdf') return { needs: true, reason: 'placeholder' };
    if (file.md5Checksum && file.md5Checksum === existingDoc.hash) return { needs: false, reason: 'hash_match' };
    const fileMod = new Date(file.modifiedTime);
    const docMod = existingDoc.modified ? new Date(existingDoc.modified) : null;
    if (docMod && fileMod <= docMod) return { needs: false, reason: 'not_modified' };
    return { needs: true, reason: 'modified' };
  }

  async processFile(userId, accessToken, file, existingDoc) {
    let content = '';
    const metadata = {
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime
    };
    try {
      if (file.mimeType === 'application/pdf') {
        const r = await pdfParser.parsePDF(file.id, accessToken, file.size, file.md5Checksum);
        content = r.text;
        metadata.pages = r.pages;
        metadata.pdfParsed = true;
        if (r.metadata?.title) metadata.pdfTitle = r.metadata.title;
        if (r.metadata?.author) metadata.pdfAuthor = r.metadata.author;
      } else if (file.mimeType.includes('document')) {
        const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
        const resp = await fetch(exportUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!resp.ok) throw new Error(`Export failed: ${resp.status}`);
        content = await resp.text();
      } else if (file.mimeType.includes('text')) {
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
        content = await resp.text();
      } else {
        throw new Error(`Unsupported mime type: ${file.mimeType}`);
      }

      if (!content || content.trim().length === 0) throw new Error('Empty content extracted');

      const { data: doc, error: upErr } = await this.supabaseAdmin
        .from('documents')
        .upsert({
          id: existingDoc?.id,
          user_id: userId,
          source_type: 'google_drive',
          source_id: file.id,
          title: file.name,
          content,
          url: file.webViewLink,
          mime_type: file.mimeType,
          file_size: parseInt(file.size) || 0,
          last_modified_at: file.modifiedTime,
          content_hash: file.md5Checksum || null,
          sync_status: 'synced',
          sync_error: null,
          metadata
        })
        .select('id')
        .single();
      if (upErr) throw upErr;

      // Chunking and embeddings are handled by existing methods in class
      const chunks = this.createChunks(content);
      await this.storeChunks(userId, doc.id, chunks, {
        title: file.name,
        url: file.webViewLink
      });

      return { ok: true };
    } catch (e) {
      await this.supabaseAdmin
        .from('documents')
        .upsert({
          id: existingDoc?.id,
          user_id: userId,
          source_type: 'google_drive',
          source_id: file.id,
          title: file.name,
          sync_status: 'error',
          sync_error: e.message
        });
      return { ok: false, error: e.message };
    }
  }

  createChunks(text) {
    const chunks = [];
    const size = this.SYNC_LIMITS.CHUNK_SIZE;
    const overlap = this.SYNC_LIMITS.CHUNK_OVERLAP;
    let i = 0;
    while (i < text.length && chunks.length < this.SYNC_LIMITS.MAX_CHUNKS_PER_DOC) {
      const end = Math.min(i + size, text.length);
      chunks.push(text.slice(i, end));
      i += size - overlap;
    }
    return chunks;
  }

  async storeChunks(userId, documentId, chunks, meta) {
    if (!chunks.length) return;
    const embeddings = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: chunks
    });
    const rows = chunks.map((chunk, idx) => ({
      document_id: documentId,
      user_id: userId,
      content: chunk,
      chunk_index: idx,
      embedding: embeddings.data[idx].embedding,
      metadata: { source_type: 'google_drive', ...meta }
    }));
    await this.supabaseAdmin.from('document_chunks').delete().eq('document_id', documentId);
    await this.supabaseAdmin.from('document_chunks').insert(rows);
  }

  async syncGoogleDriveIncremental(userId, accessToken) {
    const start = Date.now();
    const stats = { processed: 0, skipped: 0, errors: 0, newFiles: 0, updatedFiles: 0, unchangedFiles: 0 };
    console.log('\n============================================================');
    console.log('🚀 GOOGLE DRIVE INCREMENTAL SYNC');
    console.log('============================================================');
    console.log(`User: ${userId}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('============================================================\n');

    // Setup Drive client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const meta = await this.getSyncMetadata(userId);
    const syncType = this.determineSyncType(meta?.last_sync_at, meta?.last_full_sync_at);
    await this.updateSyncMetadata(userId, { status: 'running', sync_type: syncType, started_at: new Date().toISOString(), error_message: null, files_processed: 0, files_skipped: 0, files_errored: 0 });

    const files = await this.listFilesOptimized(drive, accessToken, syncType, meta?.last_sync_at);
    if (files.length === 0) {
      await this.updateSyncMetadata(userId, { status: 'completed', completed_at: new Date().toISOString(), last_sync_at: new Date().toISOString() });
      const duration = Date.now() - start;
      return { success: true, syncType, ...stats, totalDocuments: 0, totalChunks: 0, duration };
    }

    const existing = await this.getExistingDocumentHashes(userId);
    const candidates = [];
    for (const f of files) {
      const ex = existing.get(f.id);
      const decision = this.needsProcessing(f, ex);
      if (decision.needs) {
        candidates.push({ file: f, existing: ex, reason: decision.reason });
        if (decision.reason === 'new_file') stats.newFiles++;
        if (decision.reason === 'modified' || decision.reason === 'placeholder') stats.updatedFiles++;
      } else {
        stats.skipped++;
        stats.unchangedFiles++;
      }
    }

    console.log(`\n📦 Processing ${candidates.length} files in batches of ${this.INCREMENTAL_CONFIG.BATCH_SIZE}\n`);
    for (let i = 0; i < candidates.length; i += this.INCREMENTAL_CONFIG.BATCH_SIZE) {
      const batch = candidates.slice(i, i + this.INCREMENTAL_CONFIG.BATCH_SIZE);
      await Promise.all(batch.map(({ file, existing }) => this.processFile(userId, accessToken, file, existing).then(r => { if (r.ok) stats.processed++; else stats.errors++; })));
      await this.updateSyncMetadata(userId, { files_processed: stats.processed, files_skipped: stats.skipped, files_errored: stats.errors });
    }

    // Final counts
    const { count: totalDocs } = await this.supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source_type', 'google_drive')
      .eq('is_deleted', false);
    const { count: totalChunks } = await this.supabaseAdmin
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const completion = { status: 'completed', completed_at: new Date().toISOString(), last_sync_at: new Date().toISOString() };
    if (syncType === 'full') completion.last_full_sync_at = new Date().toISOString();
    await this.updateSyncMetadata(userId, completion);

    const duration = Date.now() - start;
    console.log('\n============================================================');
    console.log('✅ SYNC COMPLETED');
    console.log('============================================================');
    console.log(`Type: ${syncType}`);
    console.log(`New files: ${stats.newFiles}`);
    console.log(`Updated files: ${stats.updatedFiles}`);
    console.log(`Unchanged: ${stats.unchangedFiles}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total documents: ${totalDocs || 0}`);
    console.log(`Total chunks: ${totalChunks || 0}`);
    console.log(`Duration: ${(duration/1000).toFixed(1)}s`);
    console.log('============================================================\n');

    return { success: true, syncType, ...stats, totalDocuments: totalDocs || 0, totalChunks: totalChunks || 0, duration };
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
    
    if (!allDocs || allDocs.length === 0) return [];
    
    const similar = [];
    
    for (const doc of allDocs) {
      const storedVector = doc.metadata?.content_vector;
      if (!storedVector) continue;
      
      // Calculate similarity (0 to 1 scale)
      const similarity = cosineSimilarity(contentVector, storedVector);
      
      // Threshold: 90% similarity = likely same document
      if (similarity >= 0.90) {
        similar.push({
          document_id: doc.id,
          title: doc.title,
          source_type: doc.source_type,
          similarity_score: (similarity * 100).toFixed(1), // Percentage
          synced_at: doc.synced_at
        });
      }
    }
    
    return similar;
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
      // Check if drive.files.revisions exists
      if (!drive.files || !drive.files.revisions || !drive.files.revisions.list) {
        console.log(`  ⚠️ Revisions API not available for file ${fileId}`);
        return true; // Assume changed if revisions API not available
      }
      
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
      // Check if drive.files.revisions exists
      if (!drive.files || !drive.files.revisions || !drive.files.revisions.list) {
        console.log(`  ⚠️ Revisions API not available for file ${fileId}`);
        return null;
      }
      
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

      // List files with pagination up to MAX_DOCUMENTS, newest first
      let files = [];
      let pageToken = null;
      const pageSize = Math.min(this.SYNC_LIMITS.MAX_DOCUMENTS, 1000);
      do {
        const response = await drive.files.list({
          pageSize,
          fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, owners)',
          q: "trashed=false",
          orderBy: 'modifiedTime desc',
          pageToken,
        });
        const batch = response.data.files || [];
        files.push(...batch);
        pageToken = response.data.nextPageToken;
        console.log(`📄 Page fetched: +${batch.length}, total=${files.length}${pageToken ? `, nextPageToken present` : ''}`);
        if (files.length >= this.SYNC_LIMITS.MAX_DOCUMENTS) break;
      } while (pageToken);

      if (files.length > this.SYNC_LIMITS.MAX_DOCUMENTS) {
        files = files.slice(0, this.SYNC_LIMITS.MAX_DOCUMENTS);
      }
      console.log(`📁 Files considered for sync: ${files.length} (limit ${this.SYNC_LIMITS.MAX_DOCUMENTS})`);

      const processedDocs = [];
      let processedCount = 0;
      let skippedCount = 0;
      let totalCost = 0;

      for (const file of files) {
        // SAFETY CHECK #1: Document limit
        if (processedCount >= this.SYNC_LIMITS.MAX_DOCUMENTS) {
          console.log(`🛑 Safety limit reached: Processed ${processedCount}/${this.SYNC_LIMITS.MAX_DOCUMENTS} documents`);
          
          // Enhanced progress callback with limit information
          if (progressCallback) {
            progressCallback({
              status: 'limit_reached',
              processedDocuments: processedCount,
              totalDocuments: this.SYNC_LIMITS.MAX_DOCUMENTS,
              limitReached: true,
              message: `Document limit reached! Processed ${processedCount} of ${this.SYNC_LIMITS.MAX_DOCUMENTS} documents.`,
              remainingFiles: files.length - processedCount
            });
          }
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
            .select('id, metadata, content')
            .eq('user_id', userId)
            .eq('source_type', 'google_drive')
            .eq('source_id', file.id)
            .single();

          if (existingDoc) {
            // Check if file has changed using revision ID OR needs reprocessing (placeholder content)
            const storedRevisionId = existingDoc.metadata?.revision_id;
            let hasChanged = await this.hasFileChanged(drive, file.id, storedRevisionId);
            // Force reprocess if previous run stored placeholder PDF content
            const placeholderPattern = 'PDF text extraction is temporarily disabled';
            const hadPlaceholder = typeof existingDoc.content === 'string' && existingDoc.content.includes(placeholderPattern);
            if (!hasChanged && hadPlaceholder) {
              console.log(`  ♻️ Forcing reprocess for ${file.name} due to previous placeholder PDF content`);
              hasChanged = true;
            }
            
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

          // Generate TF-IDF content vector for similarity detection
          const contentVector = this.generateContentVector(content);
          const similar = await this.findSimilarDocuments(contentVector, userId, 'google_drive');

          // Store document with revision metadata and similarity info
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
                revision_count: revisionInfo?.revision_count,
                // TF-IDF similarity detection
                content_vector: contentVector,
                similarity_method: 'tfidf-cosine',
                potential_duplicates: similar.length > 0 ? similar : null
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

      const limitReached = processedCount >= this.SYNC_LIMITS.MAX_DOCUMENTS;
      
      console.log(`🎉 Google Drive incremental sync complete: ${processedDocs.length} documents processed, ${skippedCount} skipped, estimated cost: $${totalCost.toFixed(3)}`);
      return {
        synced: processedDocs.length,
        skipped: skippedCount,
        total: files.length,
        details: processedDocs,
        message: `Successfully synced ${processedDocs.length} documents, skipped ${skippedCount} unchanged files`,
        limitReached: limitReached,
        processedDocuments: processedCount,
        remainingFiles: limitReached ? files.length - processedCount : 0,
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
        try {
          const response = await drive.files.export({
            fileId: file.id,
            mimeType: 'text/plain',
          });
          return response.data;
        } catch (exportError) {
          if (exportError.code === 403) {
            console.log(`  ⚠️ Cannot export ${file.name} - permission denied`);
            return null;
          }
          throw exportError;
        }
      }

      // PDF parsing
      if (file.mimeType === 'application/pdf') {
        try {
          console.log(`  📄 Processing PDF: ${file.name}`);
          const response = await drive.files.get({
            fileId: file.id,
            alt: 'media',
          }, { responseType: 'arraybuffer' });
          
          const buffer = Buffer.from(response.data);
          const pdfData = await pdfParse(buffer);
          
          if (pdfData.text && pdfData.text.trim().length > 0) {
            console.log(`  ✅ PDF parsed successfully: ${file.name} (${pdfData.text.length} characters)`);
            return pdfData.text;
          } else {
            console.log(`  ⚠️ PDF has no extractable text: ${file.name}`);
            return `PDF Document: ${file.name}\n\nNote: This PDF contains no extractable text (possibly scanned image or protected).\n\nFile URL: https://drive.google.com/file/d/${file.id}/view\nCreated: ${new Date(file.createdTime).toISOString()}`;
          }
        } catch (pdfError) {
          console.log(`  ⚠️ Cannot parse PDF ${file.name}: ${pdfError.message}`);
          return `PDF Document: ${file.name}\n\nNote: PDF text extraction failed - ${pdfError.message}\n\nFile URL: https://drive.google.com/file/d/${file.id}/view\nCreated: ${new Date(file.createdTime).toISOString()}`;
        }
      }

      // Word documents
      if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const response = await drive.files.get({
            fileId: file.id,
            alt: 'media',
          }, { responseType: 'arraybuffer' });
          
          const buffer = Buffer.from(response.data);
          const result = await mammoth.extractRawText({ buffer });
          return result.value;
        } catch (wordError) {
          console.log(`  ⚠️ Cannot parse Word document ${file.name}: ${wordError.message}`);
          return null;
        }
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
