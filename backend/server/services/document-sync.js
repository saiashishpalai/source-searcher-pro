import { google } from 'googleapis';
// import * as pdfParse from 'pdf-parse'; // Removed to avoid startup issues
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
      MAX_DOCUMENTS: parseInt(process.env.MAX_GOOGLE_DRIVE_FILES) || 1000,  // Production limit
      MAX_FILE_SIZE: 1000000,     // 1MB max per file
      MAX_CHUNKS_PER_DOC: parseInt(process.env.MAX_CHUNKS_PER_DOCUMENT) || 10,  // 10 chunks max
      MAX_TEXT_LENGTH: 15000,     // ~4000 tokens max
      CHUNK_SIZE: 1500,           // ~400 tokens
      CHUNK_OVERLAP: 200,         // Prevent sentence splitting
      STOP_AT_COST: 0.50          // Stop if cost exceeds $0.50
    };
  }

  /**
   * DEPRECATED: Google Drive sync has been moved to google-drive-sync.js
   * This method is kept for backward compatibility but should not be used.
   */
  async syncGoogleDrive(userId, accessToken, supabaseAdmin, progressCallback = null) {
    console.warn('⚠️ DEPRECATED: Google Drive sync has been moved to google-drive-sync.js');
    console.warn('⚠️ Please use GoogleDriveSync class from server/services/google-drive-sync.js instead');
    throw new Error('Google Drive sync has been moved to google-drive-sync.js. Please use the new GoogleDriveSync class.');
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
        // PDF parsing temporarily disabled to avoid startup issues
        console.log(`  📄 PDF file detected: ${file.name} - PDF parsing temporarily disabled`);
        return `PDF Document: ${file.name}\n\nNote: PDF text extraction is temporarily disabled due to technical issues.\n\nFile URL: https://drive.google.com/file/d/${file.id}/view\nCreated: ${new Date(file.createdTime).toISOString()}`;
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
