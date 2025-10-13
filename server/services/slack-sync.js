import { WebClient } from '@slack/web-api';
import OpenAI from 'openai';

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
      MAX_CHANNELS: 20,              // Process max 20 conversations
      MAX_MESSAGES_PER_CHANNEL: 100, // 100 messages per channel
      MESSAGE_DAYS_BACK: 30,         // Last 30 days only
      MAX_TEXT_LENGTH: 15000,        // ~4000 tokens max
      MAX_CHUNKS_PER_DOC: 5,         // 5 chunks max
      CHUNK_SIZE: 1500,              // ~400 tokens
      CHUNK_OVERLAP: 200,            // Prevent sentence splitting
    };
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
   * Fetch messages from a conversation with thread replies
   */
  async fetchMessages(slack, channelId, oldest) {
    try {
      const result = await slack.conversations.history({
        channel: channelId,
        oldest: oldest.toString(),
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
   * Sync Slack messages for a user with SAFETY LIMITS
   */
  async syncSlack(userId, accessToken) {
    try {
      console.log(`🔄 Starting Slack sync for user ${userId} with safety limits`);
      console.log(`📊 Limits: Max ${this.SYNC_LIMITS.MAX_CHANNELS} channels, ${this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL} messages/channel, last ${this.SYNC_LIMITS.MESSAGE_DAYS_BACK} days`);

      // Initialize Slack client
      const slack = new WebClient(accessToken);
      
      console.log('✓ Slack client initialized, fetching conversations...');

      // Calculate timestamp for X days ago
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

      const processedDocs = [];
      const syncDetails = [];
      let processedCount = 0;

      // Process each conversation
      for (let i = 0; i < conversations.length; i++) {
        const conversation = conversations[i];
        const channelInfo = await this.getChannelInfo(slack, conversation.id, conversation.conversation_type || 'channel');
        
        console.log(`\n💬 [${i + 1}/${conversations.length}] Processing: ${channelInfo.name}`);
        
        try {
          // Fetch messages from this conversation
          const messages = await this.fetchMessages(slack, conversation.id, daysAgo);
          
          if (messages.length === 0) {
            console.log(`  ⊘ Skipped (no recent messages)`);
            syncDetails.push({ 
              name: channelInfo.name, 
              status: 'skipped', 
              reason: 'No recent messages' 
            });
            continue;
          }
          
          console.log(`  → Found ${messages.length} messages`);
          
          // Format messages into readable text
          const messageText = messages.map(msg => this.formatMessage(msg, userMap)).join('\n\n');
          
          if (messageText.length < 50) {
            console.log(`  ⊘ Skipped (too short: ${messageText.length} chars)`);
            syncDetails.push({ 
              name: channelInfo.name, 
              status: 'skipped', 
              reason: 'Content too short' 
            });
            continue;
          }
          
          // Calculate date range
          const oldestMsg = messages[messages.length - 1];
          const newestMsg = messages[0];
          const dateRange = `${new Date(parseFloat(oldestMsg.ts) * 1000).toLocaleDateString()} - ${new Date(parseFloat(newestMsg.ts) * 1000).toLocaleDateString()}`;
          
          const title = `${channelInfo.name} - ${dateRange}`;
          
          // Store document
          const { data: doc, error: docError } = await this.supabaseAdmin
            .from('documents')
            .upsert({
              user_id: userId,
              source_type: 'slack',
              source_id: conversation.id,
              title,
              content: messageText,
              url: `slack://channel?team=${conversation.context_team_id || ''}&id=${conversation.id}`,
              author: 'Slack Workspace',
              metadata: {
                channel_name: channelInfo.name,
                channel_type: channelInfo.type,
                message_count: messages.length,
                date_range: dateRange,
                oldest_message: oldestMsg.ts,
                newest_message: newestMsg.ts,
              },
              last_modified_at: new Date(parseFloat(newestMsg.ts) * 1000).toISOString(),
              synced_at: new Date().toISOString(),
            }, { onConflict: 'user_id,source_type,source_id' })
            .select()
            .single();
          
          if (docError) {
            console.error(`  ❌ Database error:`, docError);
            syncDetails.push({ 
              name: channelInfo.name, 
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
            name: channelInfo.name, 
            status: 'success',
            messages: messages.length,
            chunks: doc.chunks_count || 0
          });
          
        } catch (error) {
          console.error(`  ❌ Failed to process ${channelInfo.name}:`, error.message);
          syncDetails.push({ 
            name: channelInfo.name, 
            status: 'failed', 
            reason: error.message 
          });
        }
      }

      console.log(`\n🎉 Slack sync complete: ${processedCount} of ${conversations.length} conversations processed`);
      
      return {
        synced: processedCount,
        total: conversations.length,
        details: syncDetails,
        message: `Successfully synced ${processedCount} of ${conversations.length} Slack conversations`
      };

    } catch (error) {
      console.error('❌ Slack sync failed:', error);
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
}

