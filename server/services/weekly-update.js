/**
 * WeeklyUpdateService - Generates and sends weekly status updates
 * 
 * Features:
 * - LLM-powered update generation from Jira + PRD data
 * - Slack API integration (posts to channels where bot is present)
 * - Customizable schedule
 */

import OpenAI from 'openai';
import { WebClient } from '@slack/web-api';

export class WeeklyUpdateService {
  constructor(supabaseAdmin) {
    this.supabaseAdmin = supabaseAdmin;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Get Slack connection for a user
   */
  async getSlackConnection(userId) {
    const { data, error } = await this.supabaseAdmin
      .from('user_connections')
      .select('access_token, metadata')
      .eq('user_id', userId)
      .eq('source_type', 'slack')
      .single();

    if (error || !data) {
      return null;
    }
    
    // Bot token is stored in metadata
    return {
      ...data,
      bot_token: data.metadata?.bot_token
    };
  }

  /**
   * Get or create settings for a user
   */
  async getSettings(userId) {
    const { data, error } = await this.supabaseAdmin
      .from('weekly_update_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  }

  /**
   * Save settings for a user
   */
  async saveSettings(userId, settings) {
    const { data, error } = await this.supabaseAdmin
      .from('weekly_update_settings')
      .upsert({
        user_id: userId,
        slack_channel_id: settings.slackChannelId,
        slack_channel_name: settings.slackChannelName,
        schedule_day: settings.scheduleDay,
        schedule_time: settings.scheduleTime,
        timezone: settings.timezone,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Generate weekly update content using LLM
   */
  async generateUpdate(userId, options = {}) {
    // 1. Fetch all active PRDs with their tickets
    const { data: prds, error: prdError } = await this.supabaseAdmin
      .from('prd_versions')
      .select(`
        id,
        title,
        status,
        jira_project_key,
        updated_at
      `)
      .eq('user_id', userId)
      .in('status', ['published', 'ready_for_execution'])
      .order('updated_at', { ascending: false });

    if (prdError) throw prdError;

    if (!prds || prds.length === 0) {
      return {
        title: 'Weekly Update',
        content: 'No active projects to report on this week.',
        prdIds: [],
        ticketSnapshot: {}
      };
    }

    // 2. Fetch tickets for these PRDs
    const prdIds = prds.map(p => p.id);
    const { data: tickets, error: ticketError } = await this.supabaseAdmin
      .from('prd_jira_tickets')
      .select('*')
      .in('prd_version_id', prdIds)
      .eq('status', 'published');

    if (ticketError) throw ticketError;

    // 3. Aggregate data for LLM
    const projectSummaries = prds.map(prd => {
      const prdTickets = tickets?.filter(t => t.prd_version_id === prd.id) || [];
      
      const stats = {
        total: prdTickets.length,
        done: 0,
        inProgress: 0,
        blocked: 0,
        todo: 0
      };

      prdTickets.forEach(t => {
        const status = (t.jira_status || '').toLowerCase();
        if (status.includes('done') || status.includes('complete') || status.includes('closed')) {
          stats.done++;
        } else if (status.includes('progress')) {
          stats.inProgress++;
        } else if (status.includes('block')) {
          stats.blocked++;
        } else {
          stats.todo++;
        }
      });

      const completion = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

      return {
        name: prd.title,
        projectKey: prd.jira_project_key,
        stats,
        completion,
        tickets: prdTickets.map(t => ({
          key: t.jira_issue_key,
          summary: t.draft_summary,
          type: t.issue_type,
          status: t.jira_status || 'To Do',
          assignee: t.jira_assignee_name
        }))
      };
    });

    // 4. Generate update using LLM
    const prompt = this.buildUpdatePrompt(projectSummaries, options);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a Product Manager writing a weekly status update for stakeholders. 
Your updates should be:
- Concise and scannable
- Focused on progress, blockers, and next steps
- Professional but friendly
- Use bullet points and clear sections
- Include relevant metrics (% completion, tickets done)
- Highlight any risks or blockers prominently
- End with what's coming next week

Format the output as clean markdown that will render well in Slack.
Use emoji sparingly but effectively (✅ for done, 🚧 for in progress, 🚨 for blocked).`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content || 'Unable to generate update.';

    // 5. Save to database
    const { data: savedUpdate, error: saveError } = await this.supabaseAdmin
      .from('weekly_updates')
      .insert({
        user_id: userId,
        title: `Weekly Update - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        content,
        prd_ids: prdIds,
        ticket_snapshot: { projects: projectSummaries },
        status: 'draft'
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Update last_generated_at
    await this.supabaseAdmin
      .from('weekly_update_settings')
      .update({ last_generated_at: new Date().toISOString() })
      .eq('user_id', userId);

    return savedUpdate;
  }

  /**
   * Build the prompt for LLM
   */
  buildUpdatePrompt(projectSummaries, options = {}) {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let prompt = `Generate a weekly status update for ${today}.\n\n`;
    prompt += `## Projects Overview\n\n`;

    for (const project of projectSummaries) {
      prompt += `### ${project.name}\n`;
      prompt += `- Project: ${project.projectKey || 'N/A'}\n`;
      prompt += `- Completion: ${project.completion}%\n`;
      prompt += `- Stats: ${project.stats.done} done, ${project.stats.inProgress} in progress, ${project.stats.blocked} blocked, ${project.stats.todo} to do\n`;
      
      if (project.tickets.length > 0) {
        prompt += `- Key tickets:\n`;
        
        // Group by status for better readability
        const doneTickets = project.tickets.filter(t => t.status.toLowerCase().includes('done'));
        const inProgressTickets = project.tickets.filter(t => t.status.toLowerCase().includes('progress'));
        const blockedTickets = project.tickets.filter(t => t.status.toLowerCase().includes('block'));
        
        if (doneTickets.length > 0) {
          prompt += `  - Completed this week: ${doneTickets.map(t => `${t.key}: ${t.summary}`).join('; ')}\n`;
        }
        if (inProgressTickets.length > 0) {
          prompt += `  - In Progress: ${inProgressTickets.map(t => `${t.key}: ${t.summary}`).join('; ')}\n`;
        }
        if (blockedTickets.length > 0) {
          prompt += `  - ⚠️ BLOCKED: ${blockedTickets.map(t => `${t.key}: ${t.summary}`).join('; ')}\n`;
        }
      }
      prompt += `\n`;
    }

    prompt += `\nPlease write a professional weekly update that:\n`;
    prompt += `1. Summarizes overall progress across all projects\n`;
    prompt += `2. Highlights key accomplishments\n`;
    prompt += `3. Calls out any blockers or risks\n`;
    prompt += `4. Outlines focus areas for next week\n`;
    prompt += `\nKeep it concise (under 500 words) and stakeholder-friendly.`;

    return prompt;
  }

  /**
   * Send update to Slack via API
   */
  async sendToSlack(userId, updateId) {
    // Get settings
    const settings = await this.getSettings(userId);
    if (!settings?.slack_channel_id) {
      throw new Error('Slack channel not configured. Please select a channel in settings.');
    }

    // Get Slack connection
    const slackConnection = await this.getSlackConnection(userId);
    if (!slackConnection) {
      throw new Error('Slack not connected. Please connect Slack first.');
    }

    // Get the update
    const { data: update, error: updateError } = await this.supabaseAdmin
      .from('weekly_updates')
      .select('*')
      .eq('id', updateId)
      .eq('user_id', userId)
      .single();

    if (updateError || !update) {
      throw new Error('Update not found');
    }

    // Initialize Slack client with bot token
    const botToken = slackConnection.bot_token || slackConnection.access_token;
    const slack = new WebClient(botToken);

    // Format for Slack
    const slackBlocks = this.formatForSlack(update);

    // Post to channel
    try {
      await slack.chat.postMessage({
        channel: settings.slack_channel_id,
        text: update.title, // Fallback text
        blocks: slackBlocks.blocks
      });
    } catch (slackError) {
      console.error('Slack API error:', slackError);
      if (slackError.data?.error === 'channel_not_found') {
        throw new Error('Channel not found. The bot may have been removed from this channel.');
      }
      if (slackError.data?.error === 'not_in_channel') {
        throw new Error('Bot is not in this channel. Please add the Haven7 bot to the channel first.');
      }
      throw new Error(`Failed to post to Slack: ${slackError.data?.error || slackError.message}`);
    }

    // Update status
    await this.supabaseAdmin
      .from('weekly_updates')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: settings.slack_channel_name || settings.slack_channel_id
      })
      .eq('id', updateId);

    // Update last_sent_at in settings
    await this.supabaseAdmin
      .from('weekly_update_settings')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('user_id', userId);

    return { success: true, sentAt: new Date().toISOString() };
  }

  /**
   * Format markdown content for Slack Block Kit
   */
  formatForSlack(update) {
    // Convert markdown to Slack mrkdwn format
    let slackContent = update.content
      .replace(/^### /gm, '*')  // H3 to bold
      .replace(/^## /gm, '*')   // H2 to bold  
      .replace(/^# /gm, '*')    // H1 to bold
      .replace(/\*\*/g, '*')    // Bold
      .replace(/`([^`]+)`/g, '`$1`'); // Keep inline code

    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: update.title,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: slackContent.slice(0, 3000) // Slack has a 3000 char limit per block
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📅 Generated by Haven7 • ${new Date().toLocaleDateString()}`
            }
          ]
        }
      ]
    };
  }

  /**
   * Get update history for a user
   */
  async getUpdateHistory(userId, limit = 10) {
    const { data, error } = await this.supabaseAdmin
      .from('weekly_updates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a specific update
   */
  async getUpdate(userId, updateId) {
    const { data, error } = await this.supabaseAdmin
      .from('weekly_updates')
      .select('*')
      .eq('id', updateId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update content of a draft
   */
  async updateDraft(userId, updateId, content) {
    const { data, error } = await this.supabaseAdmin
      .from('weekly_updates')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', updateId)
      .eq('user_id', userId)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

