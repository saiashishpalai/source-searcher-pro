import OpenAI from 'openai';
import { computeTfIdf, cosineSimilarity } from '../utils/document-similarity.js';

/**
 * CliqSync - Handles Zoho Cliq message processing and embedding generation
 */
export class CliqSync {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.embeddingModel = 'text-embedding-3-small';
    
    // SAFETY LIMITS (matching Google Drive, Notion, and Slack)
    this.SYNC_LIMITS = {
      MAX_CHANNELS: parseInt(process.env.MAX_ZOHO_CLIQ_CHANNELS) || 10,  // Testing limit
      MAX_MESSAGES_PER_CHANNEL: parseInt(process.env.MAX_ZOHO_CLIQ_MESSAGES_PER_CHANNEL) || 100,  // Testing limit
      MESSAGE_DAYS_BACK: 90,         // Last 90 days only
      MAX_TEXT_LENGTH: 15000,        // ~4000 tokens max
      MAX_CHUNKS_PER_DOC: parseInt(process.env.MAX_CHUNKS_PER_DOCUMENT) || 10,  // 10 chunks max
      CHUNK_SIZE: 1500,              // ~400 tokens
      CHUNK_OVERLAP: 200,            // Prevent sentence splitting
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
   * Fetch channels from Zoho Cliq API
   */
  async fetchChannels(accessToken) {
    try {
      console.log('📱 Fetching Zoho Cliq channels...');
      
      // Use bot token if available, otherwise use user token
      const botToken = process.env.ZOHO_CLIQ_BOT_TOKEN;
      const tokenToUse = botToken || accessToken;
      
      console.log('🔑 Using token type:', botToken ? 'Bot Token' : 'User Token');
      
      // Use India data center endpoint for Zoho Cliq API
      const response = await fetch('https://cliq.zoho.in/api/v2/channels', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zoho Cliq API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const channels = data.channels || [];
      
      console.log(`📁 Found ${channels.length} channels`);
      return channels.slice(0, this.SYNC_LIMITS.MAX_CHANNELS);
      
    } catch (error) {
      console.error('Error fetching Cliq channels:', error.message);
      return [];
    }
  }

  /**
   * Fetch messages from a specific channel
   */
  async fetchChannelMessages(accessToken, channelId, channelName, lastSyncTimestamp = null) {
    try {
      // Calculate timestamp for X days ago (fallback if no last sync)
      const daysAgo = Math.floor(Date.now() / 1000) - (this.SYNC_LIMITS.MESSAGE_DAYS_BACK * 24 * 60 * 60);
      
      // Use last sync timestamp if available, otherwise use the provided oldest timestamp
      const oldestTimestamp = lastSyncTimestamp ? 
        Math.floor(new Date(lastSyncTimestamp).getTime() / 1000) : 
        daysAgo;
        
      console.log(`  📅 Fetching messages since: ${new Date(oldestTimestamp * 1000).toISOString()}`);
      
      // Use bot token if available, otherwise use user token
      const botToken = process.env.ZOHO_CLIQ_BOT_TOKEN;
      const tokenToUse = botToken || accessToken;
      
      // Zoho Cliq API v2 format for messages
      const response = await fetch(`https://cliq.zoho.in/api/v2/channels/${channelId}/messages?limit=100&sortOrder=asc`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error fetching messages from channel ${channelName}:`, errorText);
        console.error(`   Status: ${response.status}`);
        console.error(`   URL: https://cliq.zoho.in/api/v2/channels/${channelId}/messages`);
        return [];
      }

      const data = await response.json();
      const messages = data.messages || [];
      
      // Filter messages by timestamp if this is an incremental sync
      if (lastSyncTimestamp) {
        const lastSyncDate = new Date(lastSyncTimestamp);
        const filteredMessages = messages.filter(message => {
          const messageTime = new Date(message.time);
          return messageTime > lastSyncDate;
        });
        
        console.log(`  📨 Found ${messages.length} total messages, ${filteredMessages.length} new since last sync`);
        return filteredMessages.slice(0, this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL);
      } else {
        console.log(`  📨 Found ${messages.length} messages (first sync)`);
        return messages.slice(0, this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL);
      }

    } catch (error) {
      console.error(`Error fetching messages from channel ${channelName}:`, error.message);
      return [];
    }
  }

  /**
   * Create message-level chunks with thread context
   */
  async createMessageLevelChunks(messages, channelInfo) {
    const chunks = [];
    
    console.log(`    📝 Processing ${messages.length} messages into chunks`);
    
    for (const message of messages) {
      try {
        const chunk = await this.createChunkFromMessage(message, channelInfo);
        if (chunk) {
          chunks.push(chunk);
        }
      } catch (error) {
        console.error(`    ❌ Failed to create chunk from message:`, error.message);
      }
    }
    
    return chunks;
  }

  /**
   * Create a single chunk from a message
   */
  async createChunkFromMessage(message, channelInfo) {
    const senderName = message.sender?.name || 'Unknown User';
    const timestamp = new Date(message.time);
    const messageText = message.text || '';
    
    // Skip messages without content
    if (!messageText.trim()) {
      return null;
    }

    let chunkContent = '';
    let threadMetadata = {
      has_thread: false,
      reply_count: 0,
      participants: new Set([senderName])
    };

    // Build chunk content
    chunkContent += `${senderName}: ${messageText}`;
    
    // Handle thread replies if they exist
    if (message.replies && message.replies.length > 0) {
      threadMetadata.has_thread = true;
      threadMetadata.reply_count = message.replies.length;
      
      // Apply limit: combine if <5 replies, limit if more
      const repliesToInclude = message.replies.length <= 5 
        ? message.replies 
        : this.selectMostRelevantReplies(message.replies, 4);
      
      chunkContent += '\n\n';
      
      for (const reply of repliesToInclude) {
        const replyUser = reply.sender?.name || 'Unknown User';
        const replyText = reply.text || '';
        
        chunkContent += `└─ ${replyUser}: ${replyText}\n`;
        threadMetadata.participants.add(replyUser);
      }
      
      // Add indicator if thread was truncated
      if (message.replies.length > 5) {
        chunkContent += `└─ ... ${message.replies.length - 4} more replies`;
      }
    }

    // Check chunk size limit
    if (chunkContent.length > this.SYNC_LIMITS.MAX_TEXT_LENGTH) {
      chunkContent = this.truncateChunkContent(chunkContent, messageText, senderName);
    }

    return {
      content: chunkContent.trim(),
      metadata: {
        source_type: 'cliq',
        chunk_type: 'message_with_thread',
        message_id: message.id,
        parent_message: messageText,
        channel_id: channelInfo.id,
        channel_name: channelInfo.name,
        channel_type: channelInfo.type || 'channel',
        timestamp: timestamp.toISOString(),
        author: senderName,
        participants: Array.from(threadMetadata.participants),
        has_thread: threadMetadata.has_thread,
        reply_count: threadMetadata.reply_count,
        thread_id: message.thread_id || message.id,
        url: this.buildCliqUrl(channelInfo, message.id),
        attachments: message.attachments?.length > 0,
        reactions: message.reactions || [],
        // Enhanced semantic metadata
        conversation_topic: this.extractConversationTopic(messageText),
        message_type: this.detectMessageType(messageText),
        urgency_indicators: this.detectUrgency(messageText),
      }
    };
  }

  /**
   * Select most relevant thread replies (by reactions, recency, length)
   */
  selectMostRelevantReplies(replies, limit) {
    // Sort by relevance score
    const scoredReplies = replies.map(reply => ({
      ...reply,
      relevanceScore: this.calculateReplyRelevance(reply)
    }));
    
    return scoredReplies
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Calculate relevance score for thread replies
   */
  calculateReplyRelevance(reply) {
    let score = 0;
    
    // Higher score for replies with reactions
    if (reply.reactions && reply.reactions.length > 0) {
      score += reply.reactions.length * 2;
    }
    
    // Higher score for longer, more substantive replies
    const textLength = (reply.text || '').length;
    if (textLength > 100) score += 2;
    if (textLength > 300) score += 3;
    
    // Higher score for replies with URLs (often contain important links)
    if (reply.text && reply.text.includes('http')) {
      score += 1;
    }
    
    // Slightly lower score for very recent replies (might be less relevant)
    const age = Date.now() - (new Date(reply.time).getTime());
    if (age < 3600000) score -= 0.5; // Less than 1 hour
    
    return score;
  }

  /**
   * Truncate chunk content while preserving parent message
   */
  truncateChunkContent(fullContent, parentMessage, parentUser) {
    const maxLength = this.SYNC_LIMITS.MAX_TEXT_LENGTH - 100; // Leave room for truncation indicator
    const parentPart = `${parentUser}: ${parentMessage}`;
    
    if (fullContent.length <= this.SYNC_LIMITS.MAX_TEXT_LENGTH) {
      return fullContent;
    }
    
    // Keep parent message + truncate thread replies
    let truncated = parentPart + '\n\n';
    const remainingSpace = maxLength - truncated.length;
    
    // Try to fit as many thread replies as possible
    const lines = fullContent.split('\n');
    const threadLines = lines.slice(1); // Skip parent message line
    
    let currentLength = truncated.length;
    let includedReplies = 0;
    
    for (const line of threadLines) {
      if (currentLength + line.length + 1 > maxLength) {
        break;
      }
      truncated += line + '\n';
      currentLength += line.length + 1;
      includedReplies++;
    }
    
    if (includedReplies < threadLines.length) {
      truncated += `└─ ... ${threadLines.length - includedReplies} more replies (truncated)`;
    }
    
    return truncated;
  }

  /**
   * Extract conversation topic from message text
   */
  extractConversationTopic(text) {
    // Simple topic extraction - could be enhanced with NLP
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    const significantWords = words
      .filter(w => !stopWords.has(w) && w.length > 3)
      .slice(0, 3);
    
    return significantWords.join(' ');
  }

  /**
   * Detect message type (question, decision, status update, etc.)
   */
  detectMessageType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('?') || lowerText.startsWith('what') || lowerText.startsWith('how') || lowerText.startsWith('when')) {
      return 'question';
    }
    if (lowerText.includes('decision') || lowerText.includes('decided') || lowerText.includes('agreed')) {
      return 'decision';
    }
    if (lowerText.includes('status') || lowerText.includes('update') || lowerText.includes('progress')) {
      return 'status_update';
    }
    if (lowerText.includes('blocked') || lowerText.includes('issue') || lowerText.includes('problem')) {
      return 'blocker';
    }
    if (lowerText.includes('review') || lowerText.includes('feedback')) {
      return 'review_request';
    }
    
    return 'general';
  }

  /**
   * Detect urgency indicators in message
   */
  detectUrgency(text) {
    const urgencyWords = ['urgent', 'asap', 'critical', 'blocking', 'deadline', 'emergency'];
    const lowerText = text.toLowerCase();
    
    return urgencyWords.some(word => lowerText.includes(word));
  }

  /**
   * Build Cliq URL for the message
   */
  buildCliqUrl(channelInfo, messageId) {
    return `https://cliq.zoho.com/channel/${channelInfo.id}/message/${messageId}`;
  }

  /**
   * Store a message chunk as a document
   */
  async storeMessageChunk(userId, chunk) {
    // Generate TF-IDF content vector for similarity detection
    const contentVector = this.generateContentVector(chunk.content);
    const similar = await this.findSimilarDocuments(contentVector, userId, 'cliq');
    
    // Store as document
    const { data: doc, error: docError } = await this.supabaseAdmin
      .from('documents')
      .upsert({
        user_id: userId,
        source_type: 'cliq',
        source_id: chunk.metadata.message_id,
        title: this.generateChunkTitle(chunk),
        content: chunk.content,
        url: chunk.metadata.url,
        author: chunk.metadata.author,
        metadata: {
          ...chunk.metadata,
          // TF-IDF similarity detection
          content_vector: contentVector,
          similarity_method: 'tfidf-cosine',
          potential_duplicates: similar.length > 0 ? similar : null
        },
        last_modified_at: chunk.metadata.timestamp,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,source_type,source_id' })
      .select()
      .single();

    if (docError) {
      console.error('❌ Error storing message chunk:', docError);
      throw docError;
    }

    // Process into embeddings
    await this.processMessageChunk(doc);
  }

  /**
   * Generate a meaningful title for the message chunk
   */
  generateChunkTitle(chunk) {
    const { parent_message, channel_name, author, has_thread } = chunk.metadata;
    
    let title = `${channel_name}: ${parent_message.slice(0, 50)}${parent_message.length > 50 ? '...' : ''}`;
    
    if (has_thread) {
      title += ` (${chunk.metadata.reply_count} replies)`;
    }
    
    return title;
  }

  /**
   * Process message chunk into embeddings
   */
  async processMessageChunk(document) {
    try {
      // Delete existing chunks
      await this.supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', document.id);

      // For message chunks, we typically want the whole message as one chunk
      // But if it's very long, we might need to split it
      const chunks = this.chunkMessageContent(document.content);
      
      if (chunks.length === 0) return;

      // Generate embeddings
      const chunkData = [];
      const batchSize = 20;

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
            console.log('⚠️ OpenAI quota exceeded, skipping embeddings');
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
              ...document.metadata,
              chunk_index: i + j,
              total_chunks: chunks.length,
            },
          });
        }
      }

      // Insert chunks
      const { error } = await this.supabaseAdmin
        .from('document_chunks')
        .insert(chunkData);

      if (error) {
        console.error('Error inserting message chunks:', error);
        throw error;
      }

      console.log(`🧠 Generated ${chunkData.length} embeddings for message chunk`);
    } catch (error) {
      console.error('Error processing message chunk:', error);
      throw error;
    }
  }

  /**
   * Chunk message content (usually just one chunk for messages)
   */
  chunkMessageContent(content) {
    // Most message chunks will be small enough to be one chunk
    if (content.length <= 1500) {
      return [content];
    }
    
    // If very long, split by sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 1500) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Sync Zoho Cliq messages with incremental sync
   */
  async syncCliq(userId, accessToken) {
    try {
      console.log(`🔄 Starting Zoho Cliq incremental sync for user ${userId}`);
      console.log(`📊 Limits: Max ${this.SYNC_LIMITS.MAX_CHANNELS} channels, ${this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL} messages/channel, last ${this.SYNC_LIMITS.MESSAGE_DAYS_BACK} days`);

      // Get last sync timestamp
      const lastSyncTimestamp = await this.getLastSyncTimestamp(userId, 'cliq');
      console.log(`📅 Last sync: ${lastSyncTimestamp || 'Never'}`);

      console.log('✓ Zoho Cliq client initialized, fetching channels...');

      // Fetch channels
      const channels = await this.fetchChannels(accessToken);
      
      if (channels.length === 0) {
        console.log('⚠️ No Zoho Cliq channels found');
        return {
          synced: 0,
          total: 0,
          message: 'No Zoho Cliq channels found. Make sure the integration has access to channels.',
          details: []
        };
      }

      console.log(`📁 Found ${channels.length} channels`);

      // NEW: Track detailed statistics
      const syncStats = {
        totalChannels: channels.length,
        processedChannels: 0,
        totalMessages: 0,
        totalChunks: 0,
        channelsWithMessages: 0,
        channelsWithThreads: 0
      };

      const syncDetails = [];
      let totalChunksCreated = 0;

      // Process each channel
      for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        
        console.log(`\n💬 [${i + 1}/${channels.length}] Processing: ${channel.name}`);
        
        try {
          // Fetch messages from this channel with incremental sync
          const messages = await this.fetchChannelMessages(accessToken, channel.id, channel.name, lastSyncTimestamp);
          
          if (messages.length === 0) {
            console.log(`  ⊘ Skipped (no recent messages)`);
            syncDetails.push({ 
              name: channel.name, 
              status: 'skipped', 
              reason: 'No recent messages',
              messages: 0,
              chunks: 0
            });
            continue;
          }
          
          console.log(`  → Found ${messages.length} messages`);
          syncStats.totalMessages += messages.length;
          
          // Create message-level chunks
          const messageChunks = await this.createMessageLevelChunks(messages, channel);
          
          if (messageChunks.length === 0) {
            console.log(`  ⊘ Skipped (no valid message chunks created)`);
            syncDetails.push({ 
              name: channel.name, 
              status: 'skipped', 
              reason: 'No valid chunks',
              messages: messages.length,
              chunks: 0
            });
            continue;
          }
          
          console.log(`  📝 Created ${messageChunks.length} message-level chunks`);
          syncStats.totalChunks += messageChunks.length;
          totalChunksCreated += messageChunks.length;
          
          // Store each message chunk as a separate document
          let chunksStored = 0;
          for (const chunk of messageChunks) {
            try {
              await this.storeMessageChunk(userId, chunk);
              chunksStored++;
            } catch (error) {
              console.error(`  ❌ Failed to store chunk:`, error.message);
            }
          }
          
          // Check for threads
          const hasThreads = messages.some(msg => msg.replies && msg.replies.length > 0);
          if (hasThreads) syncStats.channelsWithThreads++;
          
          syncStats.processedChannels++;
          syncStats.channelsWithMessages++;
          
          console.log(`  ✅ Synced successfully: ${chunksStored} chunks stored`);
          syncDetails.push({ 
            name: channel.name, 
            status: 'success',
            messages: messages.length,
            chunks: chunksStored,
            hasThreads
          });
          
        } catch (error) {
          console.error(`  ❌ Failed to process ${channel.name}:`, error.message);
          syncDetails.push({ 
            name: channel.name, 
            status: 'failed', 
            reason: error.message,
            messages: 0,
            chunks: 0
          });
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId, 'cliq');

      console.log(`\n🎉 Zoho Cliq incremental sync complete!`);
      console.log(`📊 Statistics:`);
      console.log(`   • Channels processed: ${syncStats.processedChannels}/${syncStats.totalChannels}`);
      console.log(`   • Total messages: ${syncStats.totalMessages}`);
      console.log(`   • Total chunks created: ${totalChunksCreated}`);
      console.log(`   • Channels with messages: ${syncStats.channelsWithMessages}`);
      console.log(`   • Channels with threads: ${syncStats.channelsWithThreads}`);
      
      const unchangedChannels = syncStats.totalChannels - syncStats.processedChannels;
      return {
        synced: syncStats.processedChannels,
        total: syncStats.totalChannels,
        totalMessages: syncStats.totalMessages,
        totalChunks: totalChunksCreated,
        statistics: syncStats,
        details: syncDetails,
        message: `Successfully created ${totalChunksCreated} message chunks from ${syncStats.totalMessages} messages across ${syncStats.processedChannels} channels`,
        // User-friendly incremental sync feedback
        incrementalStats: {
          totalChannels: syncStats.totalChannels,
          activeChannels: syncStats.processedChannels,
          unchangedChannels: unchangedChannels,
          totalMessages: syncStats.totalMessages,
          isIncremental: lastSyncTimestamp !== null,
          efficiencyMessage: lastSyncTimestamp !== null
            ? `Smart sync: Only ${syncStats.processedChannels} of ${syncStats.totalChannels} channels had new messages since last sync (${Math.round((unchangedChannels / syncStats.totalChannels) * 100)}% were unchanged)`
            : `Full sync: All ${syncStats.totalChannels} channels were processed`
        }
      };

    } catch (error) {
      console.error('❌ Zoho Cliq sync failed:', error);
      throw error;
    }
  }
}
