/**
 * TicketDraftingService - LLM-powered PRD to Jira ticket conversion
 * 
 * Handles:
 * - PRD classification (Small/Medium/Large)
 * - Feature area inference from requirements
 * - Ticket generation with configurable granularity
 * - Acceptance criteria generation
 */

import OpenAI from 'openai';
import crypto from 'crypto';

export class TicketDraftingService {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.llmModel = 'gpt-4o-mini';
  }

  /**
   * Classify PRD size based on content analysis
   * @param {Object} prd - PRD data including sections
   * @returns {Object} Classification result
   */
  async classifyPRD(prd) {
    const prdContent = this.extractPRDContent(prd);
    
    const systemPrompt = `You are a senior PM analyzing a PRD to determine its execution complexity.

Analyze the PRD and classify it as one of:
- SMALL: 1-2 screens, low logic, fewer than 10 acceptance criteria total, can be done in a few days
- MEDIUM: Multiple flows, moderate logic, single team can deliver in 2-4 weeks
- LARGE: Multi-team effort, phased delivery, 4+ weeks, complex integrations

Consider these factors:
1. Content size and complexity
2. Number of distinct user flows mentioned
3. UI complexity (screens, components, states, edge cases)
4. System impact (integrations, data changes, API complexity)
5. Dependencies and constraints mentioned

Also identify the major feature areas that would map to Epics or story groupings.

Respond with ONLY valid JSON (no markdown code blocks):
{
  "classification": "small" | "medium" | "large",
  "reasoning": "Brief explanation of why this classification",
  "feature_areas": ["Feature Area 1", "Feature Area 2"],
  "estimated_story_count": number,
  "complexity_signals": {
    "ui_complexity": "low" | "medium" | "high",
    "flow_count": number,
    "integration_complexity": "low" | "medium" | "high"
  }
}`;

    const response = await this.openai.chat.completions.create({
      model: this.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `PRD Content:\n\n${prdContent}` }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    try {
      const content = response.choices[0]?.message?.content?.trim();
      // Handle potential markdown code block wrapping
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(jsonContent);
      
      return {
        classification: result.classification,
        reasoning: result.reasoning,
        featureAreas: result.feature_areas || [],
        estimatedStoryCount: result.estimated_story_count || 0,
        complexitySignals: result.complexity_signals
      };
    } catch (error) {
      console.error('Failed to parse classification response:', error);
      // Default to medium if parsing fails
      return {
        classification: 'medium',
        reasoning: 'Unable to analyze PRD - defaulting to medium complexity',
        featureAreas: ['Main Feature'],
        estimatedStoryCount: 5,
        complexitySignals: null
      };
    }
  }

  /**
   * Generate draft tickets from PRD
   * @param {Object} prd - PRD data including sections
   * @param {Object} options - Generation options
   * @returns {Array} Draft tickets
   */
  async generateTickets(prd, options = {}) {
    const {
      granularityMode = 'rolled_up',
      classification = 'medium',
      featureAreas = []
    } = options;

    const prdContent = this.extractPRDContent(prd);
    
    const granularityInstructions = this.getGranularityInstructions(granularityMode);
    const structureInstructions = this.getStructureInstructions(classification);

    const systemPrompt = `You are a senior PM creating Jira tickets from a PRD.

## PRD Classification: ${classification.toUpperCase()}
## Granularity Mode: ${granularityMode.replace('_', ' ').toUpperCase()}
## Feature Areas: ${featureAreas.length > 0 ? featureAreas.join(', ') : 'To be inferred'}

${structureInstructions}

${granularityInstructions}

## Ticket Format
For each ticket, provide:
- issue_type: "epic" or "story" (based on classification)
- summary: Clear, actionable title (max 80 chars, start with verb)
- description: Implementation context and notes (markdown)
- acceptance_criteria: Testable criteria (Given/When/Then or checkbox format)
- priority: "low" | "medium" | "high"
- feature_area: Which feature this belongs to
- parent_index: For stories, index of parent epic in the array (null for epics/standalone stories)

## Guidelines
1. Summaries should be action-oriented: "Implement X", "Add Y", "Create Z"
2. Descriptions should give context without repeating the PRD
3. Acceptance criteria must be testable and specific
4. Include edge cases and error states in ACs
5. Prioritize based on dependencies and user value

Respond with ONLY valid JSON (no markdown code blocks):
{
  "tickets": [
    {
      "issue_type": "epic" | "story",
      "summary": "string",
      "description": "string",
      "acceptance_criteria": "string",
      "priority": "low" | "medium" | "high",
      "feature_area": "string",
      "parent_index": null | number
    }
  ],
  "generation_notes": "Any notes about the generation"
}`;

    const response = await this.openai.chat.completions.create({
      model: this.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate Jira tickets from this PRD:\n\n${prdContent}` }
      ],
      temperature: 0.4,
      max_tokens: 4000
    });

    try {
      const content = response.choices[0]?.message?.content?.trim();
      // Handle potential markdown code block wrapping
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(jsonContent);
      
      // Process tickets to establish parent relationships
      const processedTickets = this.processTicketHierarchy(result.tickets || []);
      
      return {
        tickets: processedTickets,
        generationNotes: result.generation_notes
      };
    } catch (error) {
      console.error('Failed to parse ticket generation response:', error);
      throw new Error('Failed to generate tickets from PRD');
    }
  }

  /**
   * Save draft tickets to database
   * @param {string} prdVersionId - PRD version ID
   * @param {Array} tickets - Generated tickets
   * @returns {Array} Saved ticket records
   */
  async saveDraftTickets(prdVersionId, tickets) {
    // Delete existing drafts for this PRD (allows regeneration)
    await this.supabaseAdmin
      .from('prd_jira_tickets')
      .delete()
      .eq('prd_version_id', prdVersionId)
      .eq('status', 'draft');

    // Insert tickets in order, tracking IDs for parent relationships
    const savedTickets = [];
    const idMapping = new Map(); // temp_id -> real_id

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      
      // Resolve parent ID if this is a child ticket
      let parentTicketId = null;
      if (ticket.parent_index !== null && ticket.parent_index !== undefined) {
        const parentTempId = `temp_${ticket.parent_index}`;
        parentTicketId = idMapping.get(parentTempId);
      }

      const { data, error } = await this.supabaseAdmin
        .from('prd_jira_tickets')
        .insert({
          prd_version_id: prdVersionId,
          issue_type: ticket.issue_type,
          draft_summary: ticket.summary,
          draft_description: ticket.description,
          draft_acceptance_criteria: ticket.acceptance_criteria,
          draft_priority: ticket.priority,
          feature_area: ticket.feature_area,
          parent_ticket_id: parentTicketId,
          source_section: 'requirements', // Primary source
          source_content_hash: this.hashContent(ticket.summary + ticket.description),
          status: 'draft',
          sort_order: i
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save ticket:', error);
        continue;
      }

      // Track ID mapping for parent references
      idMapping.set(`temp_${i}`, data.id);
      savedTickets.push(data);
    }

    return savedTickets;
  }

  /**
   * Refine a single ticket based on user feedback
   * @param {Object} ticket - Current ticket data
   * @param {string} feedback - User feedback/instructions
   * @returns {Object} Refined ticket
   */
  async refineTicket(ticket, feedback) {
    const systemPrompt = `You are refining a Jira ticket based on user feedback.

Current ticket:
- Summary: ${ticket.draft_summary}
- Description: ${ticket.draft_description}
- Acceptance Criteria: ${ticket.draft_acceptance_criteria}
- Priority: ${ticket.draft_priority}

User feedback: ${feedback}

Update the ticket based on the feedback. Keep the same format and improve based on the feedback.

Respond with ONLY valid JSON:
{
  "summary": "Updated summary",
  "description": "Updated description",
  "acceptance_criteria": "Updated ACs",
  "priority": "low" | "medium" | "high"
}`;

    const response = await this.openai.chat.completions.create({
      model: this.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please refine the ticket based on the feedback.' }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    try {
      const content = response.choices[0]?.message?.content?.trim();
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Failed to parse refinement response:', error);
      throw new Error('Failed to refine ticket');
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract readable content from PRD
   */
  extractPRDContent(prd) {
    const parts = [];
    
    if (prd.title) {
      parts.push(`# ${prd.title}\n`);
    }

    // Extract from sections if available
    if (prd.sections && Array.isArray(prd.sections)) {
      for (const section of prd.sections) {
        if (section.content) {
          parts.push(`## ${section.section_id || 'Section'}\n${section.content}\n`);
        }
      }
    }

    // Or from assembled PRD text
    if (prd.assembled_prd) {
      parts.push(prd.assembled_prd);
    }

    // Or from individual fields
    const fields = ['objective', 'background', 'scope', 'requirements', 'metrics', 'dependencies', 'timeline'];
    for (const field of fields) {
      if (prd[field]) {
        parts.push(`## ${field.charAt(0).toUpperCase() + field.slice(1)}\n${prd[field]}\n`);
      }
    }

    return parts.join('\n') || 'No PRD content available';
  }

  /**
   * Get granularity-specific instructions
   */
  getGranularityInstructions(mode) {
    const instructions = {
      rolled_up: `## Rolled-Up Mode (Default)
- Create 1 story per feature area
- All UI details go into acceptance criteria
- Keep ticket count minimal
- Best for early execution and smaller teams
- Example: "Implement User Registration Flow" with detailed ACs listing all UI states`,

      balanced: `## Balanced Mode
- Create 1 story per distinct user flow or major UI surface
- UI states can be part of ACs
- Moderate ticket count
- Clear ownership per story
- Example: Separate stories for "Registration Form", "Email Verification", "Profile Setup"`,

      granular: `## Granular Mode
- Create 1 story per UI component or distinct state
- Very detailed tickets
- Higher ticket count
- Best for large teams with explicit tracking needs
- Example: Separate stories for "Registration Form Validation", "Password Strength Indicator", "Email Field"`
    };

    return instructions[mode] || instructions.rolled_up;
  }

  /**
   * Get structure instructions based on classification
   */
  getStructureInstructions(classification) {
    const structures = {
      small: `## Small PRD Structure
- Create ONLY Stories (no Epic needed)
- 3-7 stories maximum
- Stories should be independently deliverable
- Focus on user-facing outcomes`,

      medium: `## Medium PRD Structure
- Create 1 Epic as the parent container
- Create Stories under the Epic
- 5-15 stories typical
- Epic summary should capture the initiative
- Stories should map to sprint-sized work`,

      large: `## Large PRD Structure
- Create Multiple Epics grouped by feature area or phase
- Create Stories under each Epic
- 10-30+ stories possible
- Each Epic should be a coherent workstream
- Consider phased delivery in Epic structure`
    };

    return structures[classification] || structures.medium;
  }

  /**
   * Process tickets to establish proper parent-child relationships
   */
  processTicketHierarchy(tickets) {
    return tickets.map((ticket, index) => ({
      ...ticket,
      temp_id: `temp_${index}`,
      sort_order: index
    }));
  }

  /**
   * Generate content hash for drift detection
   */
  hashContent(content) {
    return crypto.createHash('sha256').update(content || '').digest('hex').slice(0, 16);
  }
}

