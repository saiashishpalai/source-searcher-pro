import { WebClient } from '@slack/web-api';
import OpenAI from 'openai';
import { createRequire } from 'module';
import { computeTfIdf, cosineSimilarity } from '../utils/document-similarity.js';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * SlackSync - Handles Slack message/file processing and embedding generation
 */
export class SlackSync {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.embeddingModel = 'text-embedding-3-small';
    
    // SAFETY LIMITS (matching Google Drive and Notion)
    this.SYNC_LIMITS = {
      MAX_DOCUMENTS: parseInt(process.env.MAX_SLACK_FILES) || 200,  // 200 document limit
      MAX_CHANNELS: parseInt(process.env.MAX_SLACK_CHANNELS) || 100,  // Production limit
      MAX_MESSAGES_PER_CHANNEL: parseInt(process.env.MAX_SLACK_MESSAGES_PER_CHANNEL) || 1000,  // Production limit
      MESSAGE_DAYS_BACK: 30,         // Last 30 days only
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
   * Format a Slack message for display
   */
  formatMessage(message, users) {
    const userName = users[message.user] || 'Unknown User';
    const timestamp = new Date(parseFloat(message.ts) * 1000).toLocaleString();
    const text = message.text || '';
    
    // Handle thread replies
    let threadText = '';
    if (message.thread_messages && message.thread_messages.length > 0) {
      threadText = message.thread_messages.map(reply => {
        const replyUser = users[reply.user] || 'Unknown User';
        return `  ↳ ${replyUser}: ${reply.text || ''}`;
      }).join('\n');
    }
    
    return `[${timestamp}] ${userName}: ${text}${threadText ? '\n' + threadText : ''}`;
  }

  /**
   * Get channel name and info
   */
  async getChannelInfo(slack, channelId, channelType) {
    try {
      if (channelType === 'im') {
        // Direct message
        const info = await slack.conversations.info({ channel: channelId });
        if (info.channel && info.channel.user) {
          const userInfo = await slack.users.info({ user: info.channel.user });
          return {
            name: `DM with @${userInfo.user.real_name || userInfo.user.name}`,
            type: 'dm',
          };
        }
        return { name: 'Direct Message', type: 'dm' };
      } else if (channelType === 'mpim') {
        // Group DM
        const info = await slack.conversations.info({ channel: channelId });
        return {
          name: info.channel.name || 'Group DM',
          type: 'group_dm',
        };
      } else {
        // Regular channel (public or private)
        const info = await slack.conversations.info({ channel: channelId });
        return {
          name: `#${info.channel.name || 'unknown'}`,
          type: info.channel.is_private ? 'private_channel' : 'public_channel',
        };
      }
    } catch (error) {
      console.error(`Error getting channel info for ${channelId}:`, error.message);
      return { name: 'Unknown Channel', type: 'channel' };
    }
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
   * Fetch messages from a conversation with thread replies
   */
  async fetchMessages(slack, channelId, oldest, lastSyncTimestamp = null) {
    try {
      // Use last sync timestamp if available, otherwise use the provided oldest timestamp
      const oldestTimestamp = lastSyncTimestamp ? 
        Math.floor(new Date(lastSyncTimestamp).getTime() / 1000) : 
        oldest;
        
      console.log(`  📅 Fetching messages since: ${new Date(oldestTimestamp * 1000).toISOString()}`);
      
      const result = await slack.conversations.history({
        channel: channelId,
        oldest: oldestTimestamp.toString(),
        limit: this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL,
      });

      const messages = result.messages || [];
      
      // Fetch thread replies for messages that have them
      for (const message of messages) {
        if (message.thread_ts && message.thread_ts === message.ts && message.reply_count > 0) {
          try {
            const threadResult = await slack.conversations.replies({
              channel: channelId,
              ts: message.thread_ts,
              limit: 50, // Limit thread replies
            });
            // Remove the parent message and keep only replies
            message.thread_messages = threadResult.messages.slice(1);
          } catch (error) {
            console.error(`  ⚠️ Failed to fetch thread replies:`, error.message);
            message.thread_messages = [];
          }
        }
      }

      return messages;
    } catch (error) {
      console.error(`Error fetching messages from ${channelId}:`, error.message);
      return [];
    }
  }

  /**
   * Test remote files access after scope installation
   */
  async testRemoteFileAccess(slack) {
    try {
      console.log('🔍 Testing remote_files:read scope...');
      
      // Test 1: List recent files
      const filesResult = await slack.files.list({
        count: 5,
        types: 'all'
      });
      
      console.log(`📁 Found ${filesResult.files?.length || 0} files accessible`);
      
      if (filesResult.files && filesResult.files.length > 0) {
        const sampleFile = filesResult.files[0];
        console.log('📄 Sample file:', {
          name: sampleFile.name,
          type: sampleFile.filetype,
          size: sampleFile.size,
          hasUrl: !!sampleFile.url_private,
          hasThumbnail: !!sampleFile.thumb_64
        });
      }
      
      // Test 2: Try to access file info
      if (filesResult.files && filesResult.files.length > 0) {
        const testFile = filesResult.files[0];
        try {
          const fileInfo = await slack.files.info({ file: testFile.id });
          console.log('✅ File info access successful:', fileInfo.file.name);
        } catch (infoError) {
          console.log('⚠️ File info access failed:', infoError.message);
        }
      }
      
      return {
        success: true,
        fileCount: filesResult.files?.length || 0,
        files: filesResult.files?.map(f => ({
          id: f.id,
          name: f.name,
          type: f.filetype,
          size: f.size,
          hasUrl: !!f.url_private
        })) || []
      };
      
    } catch (error) {
      console.error('❌ Remote files access test failed:', error.message);
      return {
        success: false,
        error: error.message,
        fileCount: 0,
        files: []
      };
    }
  }

  /**
   * Build a user map for quick lookup
   */
  async buildUserMap(slack) {
    try {
      const result = await slack.users.list({ limit: 1000 });
      const userMap = {};
      
      if (result.members) {
        result.members.forEach(user => {
          userMap[user.id] = user.real_name || user.name || 'Unknown';
        });
      }
      
      return userMap;
    } catch (error) {
      console.error('Error building user map:', error.message);
      return {};
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
   * Sync Slack messages with incremental sync and MESSAGE-LEVEL CHUNKING
   */
  async syncSlack(userId, accessToken) {
    try {
      console.log(`🔄 Starting Slack incremental sync with MESSAGE-LEVEL CHUNKING for user ${userId}`);
      console.log(`📊 Limits: Max ${this.SYNC_LIMITS.MAX_CHANNELS} conversations, ${this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL} messages/conversation, last ${this.SYNC_LIMITS.MESSAGE_DAYS_BACK} days`);

      // Validate access token
      if (!accessToken) {
        throw new Error('No Slack access token provided');
      }
      
      console.log(`🔑 Using token: ${accessToken.substring(0, 20)}...`);

      // Get last sync timestamp
      const lastSyncTimestamp = await this.getLastSyncTimestamp(userId, 'slack');
      console.log(`📅 Last sync: ${lastSyncTimestamp || 'Never'}`);

      // Initialize Slack client
      const slack = new WebClient(accessToken);
      
      console.log('✓ Slack client initialized');
      
      // Test token validity with a simple API call
      try {
        const authTest = await slack.auth.test();
        console.log(`✓ Token validation successful: ${authTest.user} (${authTest.team})`);
      } catch (authError) {
        console.error('❌ Token validation failed:', authError.message);
        throw new Error(`Invalid Slack token: ${authError.message}`);
      }
      
      // Test remote files access
      const fileAccessTest = await this.testRemoteFileAccess(slack);
      if (fileAccessTest.success) {
        console.log(`✅ Remote files access confirmed: ${fileAccessTest.fileCount} files accessible`);
      } else {
        console.log(`⚠️ Remote files access test failed: ${fileAccessTest.error}`);
      }

      // Process files
      console.log('📁 Processing Slack files...');
      const fileStats = await this.processSlackFiles(slack, userId, lastSyncTimestamp);
      console.log(`📊 Files processed: ${fileStats.processed}/${fileStats.total}`);
      
      console.log('📱 Fetching conversations...');

      // Calculate timestamp for X days ago (fallback if no last sync)
      const daysAgo = Math.floor(Date.now() / 1000) - (this.SYNC_LIMITS.MESSAGE_DAYS_BACK * 24 * 60 * 60);

      // Get all conversations (channels, DMs, group DMs)
      const conversationsResult = await slack.conversations.list({
        types: 'public_channel,private_channel,im,mpim',
        limit: this.SYNC_LIMITS.MAX_CHANNELS,
      });

      const conversations = conversationsResult.channels || [];
      
      if (conversations.length === 0) {
        console.log('⚠️ No Slack conversations found');
        return {
          synced: 0,
          total: 0,
          message: 'No Slack conversations found. Make sure the app is added to channels.',
          details: []
        };
      }

      console.log(`📁 Found ${conversations.length} conversations`);

      // Build user map for message formatting
      const userMap = await this.buildUserMap(slack);

      // NEW: Track detailed statistics
      const syncStats = {
        totalConversations: conversations.length,
        processedConversations: 0,
        totalMessages: 0,
        totalChunks: 0,
        channels: 0,
        dms: 0,
        groupDms: 0,
        conversationsWithThreads: 0,
        conversationsWithFiles: 0
      };

      const syncDetails = [];
      let totalChunksCreated = 0;

      // Process each conversation with MESSAGE-LEVEL CHUNKING
      for (let i = 0; i < conversations.length; i++) {
        const conversation = conversations[i];
        const channelInfo = await this.getChannelInfo(slack, conversation.id, conversation.conversation_type || 'channel');
        
        console.log(`\n💬 [${i + 1}/${conversations.length}] Processing: ${channelInfo.name}`);
        
        try {
          // Fetch messages from this conversation with incremental sync
          const messages = await this.fetchMessages(slack, conversation.id, daysAgo, lastSyncTimestamp);
          
          if (messages.length === 0) {
            console.log(`  ⊘ Skipped (no recent messages)`);
            syncDetails.push({ 
              name: channelInfo.name, 
              type: channelInfo.type,
              status: 'skipped', 
              reason: 'No recent messages',
              messages: 0,
              chunks: 0
            });
            continue;
          }
          
          console.log(`  → Found ${messages.length} messages`);
          syncStats.totalMessages += messages.length;
          
          // NEW: Create message-level chunks with thread context
          const messageChunks = await this.createMessageLevelChunks(messages, channelInfo, userMap, conversation);
          
          if (messageChunks.length === 0) {
            console.log(`  ⊘ Skipped (no valid message chunks created)`);
            syncDetails.push({ 
              name: channelInfo.name, 
              type: channelInfo.type,
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
          
          // Update conversation type statistics
          if (channelInfo.type === 'public_channel' || channelInfo.type === 'private_channel') {
            syncStats.channels++;
          } else if (channelInfo.type === 'dm') {
            syncStats.dms++;
          } else if (channelInfo.type === 'group_dm') {
            syncStats.groupDms++;
          }
          
          // Check for threads and files
          const hasThreads = messages.some(msg => msg.thread_ts && msg.thread_ts === msg.ts);
          const hasFiles = messages.some(msg => msg.files && msg.files.length > 0);
          
          if (hasThreads) syncStats.conversationsWithThreads++;
          if (hasFiles) syncStats.conversationsWithFiles++;
          
          syncStats.processedConversations++;
          
          console.log(`  ✅ Synced successfully: ${chunksStored} chunks stored`);
          syncDetails.push({ 
            name: channelInfo.name, 
            type: channelInfo.type,
            status: 'success',
            messages: messages.length,
            chunks: chunksStored,
            hasThreads,
            hasFiles
          });
          
        } catch (error) {
          console.error(`  ❌ Failed to process ${channelInfo.name}:`, error.message);
          syncDetails.push({ 
            name: channelInfo.name, 
            type: channelInfo.type,
            status: 'failed', 
            reason: error.message,
            messages: 0,
            chunks: 0
          });
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId, 'slack');

      console.log(`\n🎉 Slack incremental sync complete!`);
      console.log(`📊 Statistics:`);
      console.log(`   • Conversations processed: ${syncStats.processedConversations}/${syncStats.totalConversations}`);
      console.log(`   • Total messages: ${syncStats.totalMessages}`);
      console.log(`   • Total chunks created: ${totalChunksCreated}`);
      console.log(`   • Channels: ${syncStats.channels}, DMs: ${syncStats.dms}, Group DMs: ${syncStats.groupDms}`);
      console.log(`   • Conversations with threads: ${syncStats.conversationsWithThreads}`);
      console.log(`   • Conversations with files: ${syncStats.conversationsWithFiles}`);
      
      const unchangedConversations = syncStats.totalConversations - syncStats.processedConversations;
      const totalSynced = syncStats.processedConversations + (fileStats?.processed || 0);
      return {
        synced: totalSynced, // Include files in total
        total: syncStats.totalConversations + (fileStats?.total || 0),
        totalMessages: syncStats.totalMessages,
        totalChunks: totalChunksCreated,
        filesProcessed: fileStats?.processed || 0,
        filesTotal: fileStats?.total || 0,
        statistics: syncStats,
        details: syncDetails,
        message: `Successfully synced ${fileStats?.processed || 0} files and created ${totalChunksCreated} message chunks from ${syncStats.totalMessages} messages across ${syncStats.processedConversations} conversations`,
        // User-friendly incremental sync feedback
        incrementalStats: {
          totalConversations: syncStats.totalConversations,
          activeConversations: syncStats.processedConversations,
          unchangedConversations: unchangedConversations,
          totalMessages: syncStats.totalMessages,
          isIncremental: lastSyncTimestamp !== null,
          efficiencyMessage: lastSyncTimestamp !== null
            ? `Smart sync: Only ${syncStats.processedConversations} of ${syncStats.totalConversations} conversations had new messages since last sync (${Math.round((unchangedConversations / syncStats.totalConversations) * 100)}% were unchanged)`
            : `Full sync: All ${syncStats.totalConversations} conversations were processed`
        }
      };

    } catch (error) {
      console.error('❌ Slack sync failed:', error);
      throw error;
    }
  }

  /**
   * Create message-level chunks with thread context (Option 1: Combined chunks)
   */
  async createMessageLevelChunks(messages, channelInfo, userMap, conversation) {
    const chunks = [];
    
    // Filter out thread replies (we'll handle them with their parent messages)
    const parentMessages = messages.filter(msg => !msg.thread_ts || msg.thread_ts === msg.ts);
    
    console.log(`    📝 Processing ${parentMessages.length} parent messages into chunks`);
    
    for (const message of parentMessages) {
      try {
        const chunk = await this.createChunkFromMessage(message, channelInfo, userMap, conversation);
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
   * Create a single chunk from a message and its thread context
   */
  async createChunkFromMessage(message, channelInfo, userMap, conversation) {
    const userName = userMap[message.user] || 'Unknown User';
    const timestamp = new Date(parseFloat(message.ts) * 1000);
    const messageText = message.text || '';
    
    // Skip messages without content
    if (!messageText.trim()) {
      return null;
    }

    let chunkContent = '';
    let threadMetadata = {
      has_thread: false,
      reply_count: 0,
      participants: new Set([userName])
    };

    // Build chunk content with thread context
    chunkContent += `${userName}: ${messageText}`;
    
    // Handle thread replies (Option 1: Include thread replies in parent message chunk)
    if (message.thread_messages && message.thread_messages.length > 0) {
      threadMetadata.has_thread = true;
      threadMetadata.reply_count = message.thread_messages.length;
      
      // Apply your recommendation: combine if <5 replies, limit if more
      const repliesToInclude = message.thread_messages.length <= 5 
        ? message.thread_messages 
        : this.selectMostRelevantReplies(message.thread_messages, 4);
      
      chunkContent += '\n\n';
      
      for (const reply of repliesToInclude) {
        const replyUser = userMap[reply.user] || 'Unknown User';
        const replyText = reply.text || '';
        
        chunkContent += `└─ ${replyUser}: ${replyText}\n`;
        threadMetadata.participants.add(replyUser);
      }
      
      // Add indicator if thread was truncated
      if (message.thread_messages.length > 5) {
        chunkContent += `└─ ... ${message.thread_messages.length - 4} more replies`;
      }
    }

    // Check chunk size limit
    if (chunkContent.length > this.SYNC_LIMITS.MAX_TEXT_LENGTH) {
      chunkContent = this.truncateChunkContent(chunkContent, messageText, userName);
    }

    return {
      content: chunkContent.trim(),
      metadata: {
        source_type: 'slack',
        chunk_type: 'message_with_thread',
        message_id: message.ts,
        parent_message: messageText,
        channel_name: channelInfo.name,
        channel_type: channelInfo.type,
        timestamp: timestamp.toISOString(),
        author: userName,
        participants: Array.from(threadMetadata.participants),
        has_thread: threadMetadata.has_thread,
        reply_count: threadMetadata.reply_count,
        thread_id: message.thread_ts || message.ts,
        url: this.buildSlackUrl(channelInfo, message.ts, conversation),
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
    const age = Date.now() - (parseFloat(reply.ts) * 1000);
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
   * Build Slack URL for the message/thread
   */
  buildSlackUrl(channelInfo, messageTs, conversation) {
    const timestamp = messageTs.replace('.', '');
    return `slack://channel?team=${conversation.context_team_id || ''}&id=${conversation.id}&message=${timestamp}`;
  }

  /**
   * Store a message chunk as a document
   */
  async storeMessageChunk(userId, chunk) {
    // Generate TF-IDF content vector for similarity detection
    const contentVector = this.generateContentVector(chunk.content);
    const similar = await this.findSimilarDocuments(contentVector, userId, 'slack');
    
    // Store as document
    const { data: doc, error: docError } = await this.supabaseAdmin
      .from('documents')
      .upsert({
        user_id: userId,
        source_type: 'slack',
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
   * Process message chunk into embeddings (similar to existing processDocument)
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
              channel_name: document.metadata?.channel_name,
              channel_type: document.metadata?.channel_type,
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
   * Process Slack files (documents, images, etc.)
   */
  async processSlackFiles(slack, userId, lastSyncTimestamp) {
    try {
      console.log('📁 Fetching Slack files...');
      
      // Get files from the last 30 days
      // NOTE: Always fetch last 30 days of files, not just since last sync
      // This ensures files uploaded before the first sync are still processed
      const daysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      
      console.log(`📅 File search parameters:`);
      console.log(`   Searching from: ${new Date(daysAgo * 1000).toISOString()} (last 30 days)`);
      console.log(`   Note: Ignoring lastSyncTimestamp for files to ensure all files are processed`);
      
      const filesResult = await slack.files.list({
        count: 100, // Get up to 100 files
        types: 'all', // Include all file types
        ts_from: daysAgo // Always use 30 days back, not lastSyncTimestamp
      });

      const files = filesResult.files || [];
      console.log(`📁 Found ${files.length} files to process`);

      let processed = 0;
      let total = files.length;

      for (const file of files) {
        try {
          console.log(`\n  🔍 Processing file: ${file.name} (${file.filetype}, ${Math.round(file.size / 1024)}KB)`);
          
          // Check if file already exists in database
          const { data: existingDoc } = await this.supabaseAdmin
            .from('documents')
            .select('id, synced_at, content')
            .eq('user_id', userId)
            .eq('source_type', 'slack')
            .eq('source_id', file.id)
            .single();
          
          if (existingDoc) {
            // If previously stored placeholder PDF metadata, force reprocess
            const hadPlaceholder = typeof existingDoc.content === 'string' && existingDoc.content.includes('PDF text extraction is not yet implemented');
            if (!hadPlaceholder) {
              console.log(`  ✓ Already synced: ${file.name} (last synced: ${existingDoc.synced_at})`);
              processed++; // Count as processed
              continue;
            } else {
              console.log(`  ♻️ Reprocessing previously placeholder PDF: ${file.name}`);
            }
          }
          
          // Skip files that are too old or not accessible
          if (file.size > 50 * 1024 * 1024) { // Skip files larger than 50MB
            console.log(`  ⊘ Skipped ${file.name} (too large: ${Math.round(file.size / 1024 / 1024)}MB)`);
            continue;
          }

          // Get file info
          console.log(`  📋 Getting file info for: ${file.name}`);
          const fileInfo = await slack.files.info({ file: file.id });
          const fileData = fileInfo.file;
          console.log(`  📋 File info received. URL available: ${!!fileData.url_private}`);

          // Skip if file is not accessible
          if (!fileData.url_private) {
            console.log(`  ⊘ Skipped ${file.name} (not accessible - no url_private)`);
            continue;
          }

          // Download file content
          const fileContent = await this.downloadSlackFile(slack, fileData);
          if (!fileContent) {
            console.log(`  ⊘ Skipped ${file.name} (could not download - no content returned)`);
            continue;
          }
          console.log(`  ✓ File content downloaded: ${fileContent.length} characters`);


          // Generate content vector for similarity detection
          const contentVector = this.generateContentVector(fileContent);
          const similar = await this.findSimilarDocuments(contentVector, userId, 'slack');

          // Create document record
          const document = {
            user_id: userId,
            source_id: fileData.id,
            source_type: 'slack',
            title: fileData.name || 'Untitled File',
            content: fileContent,
            url: fileData.url_private,
            author: fileData.user || 'Unknown',
            synced_at: new Date().toISOString(),
            metadata: {
              file_id: fileData.id,
              file_type: fileData.filetype,
              file_size: fileData.size,
              created: fileData.created,
              timestamp: fileData.timestamp,
              channel_name: fileData.channels?.[0] || 'Direct Message',
              channel_type: fileData.channels ? 'channel' : 'dm',
              // TF-IDF similarity detection
              content_vector: contentVector,
              similarity_method: 'tfidf-cosine',
              potential_duplicates: similar.length > 0 ? similar : null
            }
          };

          // Upsert document
          const { data: doc, error } = await this.supabaseAdmin
            .from('documents')
            .upsert(document, { 
              onConflict: 'user_id,source_id,source_type',
              ignoreDuplicates: false 
            })
            .select()
            .single();

          if (error) {
            console.error(`  ❌ Error saving file ${file.name}:`, error);
            continue;
          }

          // Process into embeddings
          await this.processMessageChunk(doc);
          
          processed++;
          console.log(`  ✓ Processed ${file.name} (${fileData.filetype})`);

        } catch (error) {
          console.error(`  ❌ Error processing file ${file.name}:`, error.message);
          continue;
        }
      }

      return { processed, total };

    } catch (error) {
      console.error('❌ Error processing Slack files:', error);
      return { processed: 0, total: 0 };
    }
  }

  /**
   * Download Slack file content
   */
  async downloadSlackFile(slack, fileData) {
    try {
      console.log(`  📥 Attempting to download: ${fileData.name} (${fileData.filetype})`);
      
      // Check if file has accessible URL
      if (!fileData.url_private && !fileData.url_private_download) {
        console.log(`  ⚠️ No private URL available for ${fileData.name}`);
        return null;
      }

      // For text-based files, try to get content directly
      if (fileData.filetype === 'text' || fileData.filetype === 'javascript' || fileData.filetype === 'json') {
        try {
          // Use url_private_download to fetch content
          const response = await fetch(fileData.url_private_download, {
            headers: {
              'Authorization': `Bearer ${slack.token}`
            }
          });
          
          if (response.ok) {
            const content = await response.text();
            console.log(`  ✓ Downloaded text file: ${fileData.name} (${content.length} chars)`);
            return content;
          }
        } catch (fetchError) {
          console.log(`  ⚠️ Could not fetch text content: ${fetchError.message}`);
        }
      }

      // For PDF files, download and parse
      if (fileData.filetype === 'pdf') {
        try {
          console.log(`  📄 Processing PDF: ${fileData.name}`);
          
          // Download PDF file
          const response = await fetch(fileData.url_private_download, {
            headers: {
              'Authorization': `Bearer ${slack.token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const pdfData = await pdfParse(buffer);
          
          if (pdfData.text && pdfData.text.trim().length > 0) {
            console.log(`  ✅ PDF parsed successfully: ${fileData.name} (${pdfData.text.length} characters)`);
            return pdfData.text;
          } else {
            console.log(`  ⚠️ PDF has no extractable text: ${fileData.name}`);
            return `PDF Document: ${fileData.name}\n\nNote: This PDF contains no extractable text (possibly scanned image or protected).\n\nFile URL: ${fileData.permalink}\nCreated: ${new Date(fileData.created * 1000).toISOString()}`;
          }
        } catch (pdfError) {
          console.log(`  ⚠️ Cannot parse PDF ${fileData.name}: ${pdfError.message}`);
          return `PDF Document: ${fileData.name}\n\nNote: PDF text extraction failed - ${pdfError.message}\n\nFile URL: ${fileData.permalink}\nCreated: ${new Date(fileData.created * 1000).toISOString()}`;
        }
      }

      // For other file types, return metadata
      console.log(`  📎 File type ${fileData.filetype} - returning metadata`);
      return `File: ${fileData.name}\nType: ${fileData.filetype}\nSize: ${fileData.size} bytes\nCreated: ${new Date(fileData.created * 1000).toISOString()}\nURL: ${fileData.permalink || 'N/A'}`;

    } catch (error) {
      console.error(`  ❌ Error downloading file ${fileData.name}:`, error.message);
      return null;
    }
  }
}

