import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { computeTfIdf, cosineSimilarity } from '../utils/document-similarity.js';

/**
 * TeamsSync - Handles Microsoft Teams message processing and embedding generation
 */
export class TeamsSync {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.embeddingModel = 'text-embedding-3-small';
    
    // SAFETY LIMITS (matching other integrations)
    this.SYNC_LIMITS = {
      MAX_TEAMS: parseInt(process.env.MAX_TEAMS) || 10,  // Limit teams for testing
      MAX_CHANNELS_PER_TEAM: parseInt(process.env.MAX_CHANNELS_PER_TEAM) || 20,
      MAX_MESSAGES_PER_CHANNEL: parseInt(process.env.MAX_MESSAGES_PER_CHANNEL) || 50,
      MAX_TEXT_LENGTH: 15000,      // ~4000 tokens max
      MAX_CHUNKS_PER_DOC: parseInt(process.env.MAX_CHUNKS_PER_DOCUMENT) || 10,
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
   * Get Graph API client with token refresh
   */
  async getGraphClient(userId) {
    const { data: connection } = await this.supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'teams')
      .single();

    if (!connection) {
      throw new Error('Teams not connected');
    }

    // Check if token needs refresh (implement basic expiration check)
    const now = new Date();
    const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    
    if (tokenExpiry && now >= tokenExpiry) {
      console.log('🔄 Teams token expired, attempting refresh...');
      try {
        const newToken = await this.refreshTeamsToken(userId);
        return axios.create({
          baseURL: 'https://graph.microsoft.com/v1.0',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        throw new Error('Teams token expired and refresh failed');
      }
    }

    return axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Refresh Teams access token
   */
  async refreshTeamsToken(userId) {
    const { data: connection } = await this.supabaseAdmin
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'teams')
      .single();

    if (!connection || !connection.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
        scope: 'https://graph.microsoft.com/.default offline_access'
      })
    );

    const { access_token, refresh_token, expires_in } = response.data;
    
    // Update connection with new tokens
    await this.supabaseAdmin
      .from('user_connections')
      .update({
        access_token: access_token,
        refresh_token: refresh_token || connection.refresh_token,
        token_expires_at: expires_in 
          ? new Date(Date.now() + expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    console.log('✅ Teams token refreshed successfully');
    return access_token;
  }

  /**
   * Extract text from Teams message
   */
  extractMessageContent(message) {
    let content = '';
    
    // Extract text from body
    if (message.body?.content) {
      // Strip HTML tags (Teams uses HTML format)
      content = message.body.content.replace(/<[^>]*>/g, ' ').trim();
    }
    
    // Extract text from attachments (adaptive cards, etc.)
    if (message.attachments) {
      message.attachments.forEach(att => {
        if (att.contentType === 'text' || att.contentType === 'html') {
          content += ' ' + (att.content || '').replace(/<[^>]*>/g, ' ');
        }
      });
    }
    
    return content.replace(/\s+/g, ' ').trim();
  }

  /**
   * Chunk text for embeddings
   */
  chunkText(text, chunkSize = 1500, overlap = 200) {
    if (text.length <= chunkSize) return [text];
    
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }

  /**
   * Generate embeddings using OpenAI
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error.response?.data || error);
      throw error;
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
   * Main sync function
   */
  async syncTeams(userId) {
    console.log('🔄 Starting Teams sync for user:', userId);
    
    const graphClient = await this.getGraphClient(userId);
    const syncResults = {
      teams: 0,
      channels: 0,
      messages: 0,
      chunks: 0,
      errors: []
    };

    try {
      // Get last sync timestamp
      const lastSyncTimestamp = await this.getLastSyncTimestamp(userId, 'teams');
      console.log(`📅 Last sync: ${lastSyncTimestamp || 'Never'}`);

      // Get all teams user is member of
      console.log('🔍 Attempting to get joined teams...');
      let teams = [];
      try {
        const teamsResponse = await graphClient.get('/me/joinedTeams');
        console.log('✅ Teams response received:', teamsResponse.data);
        teams = teamsResponse.data.value;
        console.log(`Found ${teams.length} teams`);
      } catch (teamsError) {
        console.log('⚠️ /me/joinedTeams failed, trying alternative approach...');
        console.log('📊 Teams error details:', teamsError.response?.data);
        
        // Check if it's a license issue
        if (teamsError.response?.data?.error?.message?.includes('license')) {
          throw new Error('Microsoft Teams requires a valid Office 365 license. Please use a work or school account with Teams access.');
        }
        
        // Try alternative endpoint
        try {
          const teamsResponse = await graphClient.get('/teams');
          console.log('✅ Alternative teams response received:', teamsResponse.data);
          teams = teamsResponse.data.value;
          console.log(`Found ${teams.length} teams`);
        } catch (altError) {
          console.log('📊 Alternative endpoint also failed:', altError.response?.data);
          if (altError.response?.data?.error?.message?.includes('license')) {
            throw new Error('Microsoft Teams requires a valid Office 365 license. Please use a work or school account with Teams access.');
          }
          throw altError;
        }
      }

      for (const team of teams.slice(0, this.SYNC_LIMITS.MAX_TEAMS)) {
        console.log(`Processing team: ${team.displayName}`);
        syncResults.teams++;

        try {
          // Get all channels in team
          const channelsResponse = await graphClient.get(`/teams/${team.id}/channels`);
          const channels = channelsResponse.data.value;
          
          for (const channel of channels.slice(0, this.SYNC_LIMITS.MAX_CHANNELS_PER_TEAM)) {
            console.log(`  Processing channel: ${channel.displayName}`);
            syncResults.channels++;

            try {
              // Get messages from channel with date filter
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
              let filterQuery = `lastModifiedDateTime gt ${thirtyDaysAgo}`;
              
              // Add incremental sync filter if available
              if (lastSyncTimestamp) {
                const lastSyncDate = new Date(lastSyncTimestamp);
                filterQuery = `lastModifiedDateTime gt ${lastSyncDate.toISOString()}`;
              }

              const messagesResponse = await graphClient.get(
                `/teams/${team.id}/channels/${channel.id}/messages`,
                {
                  params: {
                    $top: this.SYNC_LIMITS.MAX_MESSAGES_PER_CHANNEL,
                    $filter: filterQuery
                  }
                }
              );
              
              const messages = messagesResponse.data.value || [];
              console.log(`    Found ${messages.length} messages`);

              for (const message of messages) {
                // Skip system messages, only process user messages
                if (message.messageType !== 'message') {
                  continue;
                }

                const content = this.extractMessageContent(message);
                
                if (content.length < 50) continue; // Skip very short messages
                
                console.log(`      Processing message from ${message.from?.user?.displayName || 'Unknown'}`);
                
                // Generate TF-IDF content vector for similarity detection
                const contentVector = this.generateContentVector(content);
                const similar = await this.findSimilarDocuments(contentVector, userId, 'teams');
                
                // Store document in database
                const { data: document, error: docError } = await this.supabaseAdmin
                  .from('documents')
                  .upsert({
                    user_id: userId,
                    source_type: 'teams',
                    source_id: message.id,
                    title: `${team.displayName} - ${channel.displayName}`,
                    content: content,
                    url: message.webUrl,
                    author: message.from?.user?.displayName || 'Unknown',
                    metadata: {
                      team_id: team.id,
                      team_name: team.displayName,
                      channel_id: channel.id,
                      channel_name: channel.displayName,
                      from: message.from?.user?.displayName || 'Unknown',
                      created_at: message.createdDateTime,
                      message_type: message.messageType,
                      // TF-IDF similarity detection
                      content_vector: contentVector,
                      similarity_method: 'tfidf-cosine',
                      potential_duplicates: similar.length > 0 ? similar : null
                    },
                    last_modified_at: message.lastModifiedDateTime,
                    synced_at: new Date().toISOString()
                  }, { onConflict: 'user_id,source_type,source_id' })
                  .select()
                  .single();

                if (docError) {
                  console.error('Document insert error:', docError);
                  syncResults.errors.push(docError.message);
                  continue;
                }

                syncResults.messages++;

                // Generate chunks and embeddings
                const chunks = this.chunkText(content);
                console.log(`      Generating ${chunks.length} chunks for message`);

                for (let i = 0; i < chunks.length; i++) {
                  try {
                    const embedding = await this.generateEmbedding(chunks[i]);
                    
                    const { error: chunkError } = await this.supabaseAdmin
                      .from('document_chunks')
                      .upsert({
                        document_id: document.id,
                        user_id: userId,
                        chunk_index: i,
                        content: chunks[i],
                        token_count: Math.ceil(chunks[i].length / 4),
                        embedding: embedding,
                        metadata: {
                          source_type: 'teams',
                          team_name: team.displayName,
                          channel_name: channel.displayName,
                          from: message.from?.user?.displayName,
                          url: message.webUrl
                        }
                      }, { onConflict: 'document_id,chunk_index' });

                    if (chunkError) {
                      console.error('Chunk insert error:', chunkError);
                      syncResults.errors.push(chunkError.message);
                    } else {
                      syncResults.chunks++;
                    }
                  } catch (embeddingError) {
                    console.error('Embedding generation error:', embeddingError);
                    syncResults.errors.push(`Embedding error: ${embeddingError.message}`);
                  }
                }

                // Add delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (channelError) {
              console.error(`Error processing channel ${channel.displayName}:`, channelError.message);
              syncResults.errors.push(`Channel ${channel.displayName}: ${channelError.message}`);
            }
          }
        } catch (teamError) {
          console.error(`Error processing team ${team.displayName}:`, teamError.message);
          syncResults.errors.push(`Team ${team.displayName}: ${teamError.message}`);
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId, 'teams');

      console.log(`\n🎉 Teams sync complete: ${syncResults.messages} messages, ${syncResults.chunks} chunks`);
      
      return {
        synced: syncResults.messages,
        total: syncResults.messages,
        details: [],
        message: `Successfully synced ${syncResults.messages} Teams messages`,
        incrementalStats: {
          totalTeams: syncResults.teams,
          totalChannels: syncResults.channels,
          totalMessages: syncResults.messages,
          totalChunks: syncResults.chunks,
          errors: syncResults.errors,
          isIncremental: lastSyncTimestamp !== null,
          efficiencyMessage: lastSyncTimestamp !== null
            ? `Incremental sync: Only new messages since ${lastSyncTimestamp}`
            : `Full sync: All messages from last 30 days`
        }
      };

    } catch (error) {
      console.error('❌ Teams sync failed:', error);
      if (error.response) {
        console.error('📊 Error response status:', error.response.status);
        console.error('📊 Error response data:', error.response.data);
      }
      throw error;
    }
  }
}
