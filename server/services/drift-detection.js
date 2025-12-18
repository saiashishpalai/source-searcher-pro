/**
 * DriftDetectionService - Detects PRD changes that affect linked Jira tickets
 * 
 * Handles:
 * - Detecting PRD edits after tickets are published
 * - Flagging affected tickets
 * - Suggesting actions
 */

import OpenAI from 'openai';
import crypto from 'crypto';

export class DriftDetectionService {
  constructor(openaiApiKey, supabaseAdmin) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabaseAdmin = supabaseAdmin;
    this.llmModel = 'gpt-4o-mini';
  }

  /**
   * Check for drift when a PRD section is updated
   * @param {string} prdVersionId - PRD version ID
   * @param {string} sectionId - Updated section ID
   * @param {string} oldContent - Previous content
   * @param {string} newContent - New content
   * @returns {Object|null} Drift log or null if no drift
   */
  async checkForDrift(prdVersionId, sectionId, oldContent, newContent) {
    try {
      // Get PRD and check if it has published tickets
      const { data: prd, error: prdError } = await this.supabaseAdmin
        .from('prd_versions')
        .select('id, status, locked_at')
        .eq('id', prdVersionId)
        .single();

      if (prdError || !prd) {
        return null;
      }

      // Only check drift for PRDs that are ready for execution or have published tickets
      if (prd.status !== 'ready_for_execution' && !prd.locked_at) {
        return null;
      }

      // Get published tickets
      const { data: tickets, error: ticketsError } = await this.supabaseAdmin
        .from('prd_jira_tickets')
        .select('id, jira_issue_key, draft_summary, source_section')
        .eq('prd_version_id', prdVersionId)
        .eq('status', 'published');

      if (ticketsError || !tickets || tickets.length === 0) {
        return null;
      }

      // Check if content actually changed significantly
      if (!this.hasSignificantChange(oldContent, newContent)) {
        return null;
      }

      // Assess severity and affected tickets
      const severity = await this.assessSeverity(sectionId, oldContent, newContent, tickets);
      const affectedTickets = this.findAffectedTickets(sectionId, tickets);
      
      if (affectedTickets.length === 0) {
        return null;
      }

      // Generate suggested action
      const suggestedAction = await this.suggestAction(sectionId, oldContent, newContent, affectedTickets);

      // Create drift log
      const { data: driftLog, error: driftError } = await this.supabaseAdmin
        .from('prd_drift_logs')
        .insert({
          prd_version_id: prdVersionId,
          change_type: 'prd_edited',
          change_summary: `Section "${sectionId}" was modified`,
          changed_sections: [sectionId],
          change_details: {
            section: sectionId,
            old_hash: this.hashContent(oldContent),
            new_hash: this.hashContent(newContent),
            change_size: Math.abs((newContent?.length || 0) - (oldContent?.length || 0))
          },
          affected_ticket_ids: affectedTickets.map(t => t.id),
          severity: severity,
          suggested_action: suggestedAction.text,
          suggested_action_type: suggestedAction.type,
          status: 'pending'
        })
        .select()
        .single();

      if (driftError) {
        console.error('Failed to create drift log:', driftError);
        return null;
      }

      return driftLog;
    } catch (error) {
      console.error('Drift detection error:', error);
      return null;
    }
  }

  /**
   * Get pending drift logs for a PRD
   */
  async getPendingDrift(prdVersionId) {
    const { data, error } = await this.supabaseAdmin
      .from('prd_drift_logs')
      .select('*')
      .eq('prd_version_id', prdVersionId)
      .eq('status', 'pending')
      .order('detected_at', { ascending: false });

    if (error) {
      throw new Error('Failed to get drift logs');
    }

    return data || [];
  }

  /**
   * Acknowledge a drift log
   */
  async acknowledgeDrift(logId, userId) {
    const { data, error } = await this.supabaseAdmin
      .from('prd_drift_logs')
      .update({
        status: 'acknowledged',
        acknowledged_by: userId
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to acknowledge drift');
    }

    return data;
  }

  /**
   * Resolve a drift log with an action
   */
  async resolveDrift(logId, userId, resolution) {
    const { data, error } = await this.supabaseAdmin
      .from('prd_drift_logs')
      .update({
        status: 'resolved',
        resolution: resolution,
        resolved_at: new Date().toISOString(),
        acknowledged_by: userId
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to resolve drift');
    }

    return data;
  }

  /**
   * Dismiss a drift log
   */
  async dismissDrift(logId, userId) {
    const { data, error } = await this.supabaseAdmin
      .from('prd_drift_logs')
      .update({
        status: 'dismissed',
        resolution: 'ignored',
        resolved_at: new Date().toISOString(),
        acknowledged_by: userId
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to dismiss drift');
    }

    return data;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if content change is significant
   */
  hasSignificantChange(oldContent, newContent) {
    if (!oldContent && !newContent) return false;
    if (!oldContent || !newContent) return true;
    
    // Normalize whitespace and compare
    const normalizedOld = oldContent.replace(/\s+/g, ' ').trim();
    const normalizedNew = newContent.replace(/\s+/g, ' ').trim();
    
    if (normalizedOld === normalizedNew) return false;
    
    // Check if change is more than just minor edits (>10% change)
    const oldLen = normalizedOld.length;
    const newLen = normalizedNew.length;
    const diff = Math.abs(oldLen - newLen);
    
    if (diff < 20 && diff / Math.max(oldLen, newLen) < 0.1) {
      return false;
    }
    
    return true;
  }

  /**
   * Find tickets that might be affected by section change
   */
  findAffectedTickets(sectionId, tickets) {
    // Map section IDs to likely ticket relationships
    const sectionToImpact = {
      'objective': ['all'],      // Affects all tickets (scope change)
      'scope': ['all'],          // Affects all tickets
      'requirements': ['all'],   // Direct impact on all stories
      'metrics': [],             // Usually doesn't affect tickets
      'dependencies': ['all'],   // Could affect implementation
      'timeline': [],            // Usually doesn't affect tickets
      'background': []           // Context, rarely affects tickets
    };

    const impactLevel = sectionToImpact[sectionId] || [];
    
    if (impactLevel.includes('all')) {
      return tickets;
    }
    
    // For specific sections, check source_section mapping
    return tickets.filter(t => 
      t.source_section === sectionId || 
      impactLevel.includes(t.source_section)
    );
  }

  /**
   * Assess severity of the change
   */
  async assessSeverity(sectionId, oldContent, newContent, affectedTickets) {
    // High impact sections
    const highImpact = ['requirements', 'scope', 'objective'];
    const mediumImpact = ['dependencies'];
    
    if (highImpact.includes(sectionId)) {
      // Check content diff size
      const oldLen = oldContent?.length || 0;
      const newLen = newContent?.length || 0;
      const changeRatio = Math.abs(newLen - oldLen) / Math.max(oldLen, 1);
      
      if (changeRatio > 0.3 || affectedTickets.length > 5) {
        return 'high';
      }
      return 'medium';
    }
    
    if (mediumImpact.includes(sectionId)) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Suggest action for drift resolution
   */
  async suggestAction(sectionId, oldContent, newContent, affectedTickets) {
    // Simple heuristics for now (can be enhanced with LLM)
    if (sectionId === 'requirements' || sectionId === 'scope') {
      if (newContent && newContent.length > (oldContent?.length || 0) * 1.5) {
        return {
          type: 'create_ticket',
          text: `Scope has expanded significantly. Consider creating new tickets for the additional requirements. ${affectedTickets.length} existing tickets may need review.`
        };
      }
      return {
        type: 'update_ticket',
        text: `Requirements have changed. Review and update the ${affectedTickets.length} affected ticket(s) to reflect the new requirements.`
      };
    }
    
    if (sectionId === 'objective') {
      return {
        type: 'review',
        text: `The product objective has changed. Review all ${affectedTickets.length} tickets to ensure they still align with the new direction.`
      };
    }
    
    return {
      type: 'review',
      text: `PRD section "${sectionId}" was updated. ${affectedTickets.length} ticket(s) may be affected.`
    };
  }

  /**
   * Generate content hash
   */
  hashContent(content) {
    return crypto.createHash('sha256').update(content || '').digest('hex').slice(0, 16);
  }
}

