/**
 * JiraApiService - Low-level wrapper for Jira Cloud REST API
 * 
 * Handles all direct Jira API interactions:
 * - Issue CRUD operations
 * - Project and metadata queries
 * - Search with JQL
 * - Comment retrieval
 */

export class JiraApiService {
  /**
   * Create a new JiraApiService instance
   * @param {string} accessToken - Valid Jira access token
   * @param {string} cloudId - Atlassian cloud instance ID
   * @param {string} siteUrl - Jira site URL (for building links)
   */
  constructor(accessToken, cloudId, siteUrl) {
    this.accessToken = accessToken;
    this.cloudId = cloudId;
    this.siteUrl = siteUrl;
    this.apiBaseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
  }

  /**
   * Make authenticated request to Jira API
   * @param {string} endpoint - API endpoint (relative to base)
   * @param {Object} options - Fetch options
   * @returns {Object} Response data
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Handle no content responses
    if (response.status === 204) {
      return { success: true };
    }
    
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      let errorMessage = `Jira API error: ${response.status}`;
      
      if (data.errorMessages?.length > 0) {
        errorMessage = data.errorMessages.join(', ');
      } else if (data.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
        errorMessage = Object.values(data.errors).join(', ');
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      console.error('Jira API error:', { endpoint, status: response.status, data });
      throw new Error(errorMessage);
    }
    
    return data;
  }

  // ============================================================================
  // Project Operations
  // ============================================================================

  /**
   * Get all accessible projects
   * @param {Object} options - Query options
   * @returns {Array} List of projects
   */
  async getProjects(options = {}) {
    const params = new URLSearchParams({
      maxResults: options.maxResults || '50',
      startAt: options.startAt || '0',
      orderBy: 'name',
      expand: 'description,lead'
    });
    
    const data = await this.request(`/project/search?${params.toString()}`);
    return data.values || [];
  }

  /**
   * Get specific project details
   * @param {string} projectKeyOrId - Project key or ID
   * @returns {Object} Project details
   */
  async getProject(projectKeyOrId) {
    return this.request(`/project/${projectKeyOrId}`);
  }

  /**
   * Get issue types for a project
   * @param {string} projectKeyOrId - Project key or ID
   * @returns {Array} List of issue types
   */
  async getProjectIssueTypes(projectKeyOrId) {
    const project = await this.request(`/project/${projectKeyOrId}`);
    return project.issueTypes || [];
  }

  /**
   * Get createmeta for a project (fields required for issue creation)
   * @param {string} projectKey - Project key
   * @param {string} issueTypeName - Issue type name (e.g., 'Epic', 'Story')
   * @returns {Object} Create metadata
   */
  async getCreateMeta(projectKey, issueTypeName) {
    const params = new URLSearchParams({
      projectKeys: projectKey,
      issuetypeNames: issueTypeName,
      expand: 'projects.issuetypes.fields'
    });
    
    return this.request(`/issue/createmeta?${params.toString()}`);
  }

  // ============================================================================
  // Issue Operations
  // ============================================================================

  /**
   * Create a new issue
   * @param {Object} issueData - Issue data
   * @returns {Object} Created issue
   */
  async createIssue(issueData) {
    const { projectKey, issueType, summary, description, parentKey, priority, labels, customFields } = issueData;
    
    const fields = {
      project: { key: projectKey },
      issuetype: { name: issueType },
      summary: summary.slice(0, 255), // Jira summary max length
      description: this.formatDescription(description)
    };
    
    // Add parent for subtasks/stories under epics
    if (parentKey) {
      // For Epic links, use the parent field (Jira Next-Gen) or Epic Link custom field (Classic)
      if (issueType.toLowerCase() === 'story' || issueType.toLowerCase() === 'task') {
        fields.parent = { key: parentKey };
      }
    }
    
    // Add priority if specified
    if (priority) {
      fields.priority = { name: this.mapPriority(priority) };
    }
    
    // Add labels if specified
    if (labels && labels.length > 0) {
      fields.labels = labels;
    }
    
    // Add any custom fields
    if (customFields) {
      Object.assign(fields, customFields);
    }
    
    const response = await this.request('/issue', {
      method: 'POST',
      body: JSON.stringify({ fields })
    });
    
    return {
      id: response.id,
      key: response.key,
      self: response.self,
      url: `${this.siteUrl}/browse/${response.key}`
    };
  }

  /**
   * Create multiple issues in bulk
   * @param {Array} issues - Array of issue data objects
   * @returns {Object} Bulk creation results
   */
  async createIssuesBulk(issues) {
    const issueUpdates = issues.map(issue => ({
      fields: {
        project: { key: issue.projectKey },
        issuetype: { name: issue.issueType },
        summary: issue.summary.slice(0, 255),
        description: this.formatDescription(issue.description),
        ...(issue.parentKey && { parent: { key: issue.parentKey } }),
        ...(issue.priority && { priority: { name: this.mapPriority(issue.priority) } }),
        ...(issue.labels && { labels: issue.labels })
      }
    }));
    
    const response = await this.request('/issue/bulk', {
      method: 'POST',
      body: JSON.stringify({ issueUpdates })
    });
    
    return {
      issues: response.issues?.map(issue => ({
        id: issue.id,
        key: issue.key,
        url: `${this.siteUrl}/browse/${issue.key}`
      })) || [],
      errors: response.errors || []
    };
  }

  /**
   * Get issue by key or ID
   * @param {string} issueKeyOrId - Issue key or ID
   * @param {Array} fields - Fields to retrieve
   * @returns {Object} Issue data
   */
  async getIssue(issueKeyOrId, fields = []) {
    const params = fields.length > 0 
      ? `?fields=${fields.join(',')}` 
      : '?fields=summary,description,status,assignee,priority,issuetype,parent,created,updated,labels';
    
    const issue = await this.request(`/issue/${issueKeyOrId}${params}`);
    
    return {
      id: issue.id,
      key: issue.key,
      summary: issue.fields?.summary,
      description: issue.fields?.description,
      status: issue.fields?.status?.name,
      statusCategory: issue.fields?.status?.statusCategory?.key, // 'new', 'indeterminate', 'done'
      assignee: issue.fields?.assignee ? {
        id: issue.fields.assignee.accountId,
        name: issue.fields.assignee.displayName,
        email: issue.fields.assignee.emailAddress
      } : null,
      priority: issue.fields?.priority?.name,
      issueType: issue.fields?.issuetype?.name,
      parentKey: issue.fields?.parent?.key,
      created: issue.fields?.created,
      updated: issue.fields?.updated,
      labels: issue.fields?.labels || [],
      url: `${this.siteUrl}/browse/${issue.key}`
    };
  }

  /**
   * Update an existing issue
   * @param {string} issueKeyOrId - Issue key or ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Update result
   */
  async updateIssue(issueKeyOrId, updateData) {
    const fields = {};
    
    if (updateData.summary) {
      fields.summary = updateData.summary.slice(0, 255);
    }
    
    if (updateData.description) {
      fields.description = this.formatDescription(updateData.description);
    }
    
    if (updateData.priority) {
      fields.priority = { name: this.mapPriority(updateData.priority) };
    }
    
    if (updateData.labels) {
      fields.labels = updateData.labels;
    }
    
    await this.request(`/issue/${issueKeyOrId}`, {
      method: 'PUT',
      body: JSON.stringify({ fields })
    });
    
    return { success: true, key: issueKeyOrId };
  }

  /**
   * Search issues using JQL
   * @param {string} jql - JQL query string
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchIssues(jql, options = {}) {
    const fields = options.fields || ['summary', 'status', 'assignee', 'priority', 'issuetype', 'parent', 'updated', 'created'];
    
    // Use GET request with query parameters for the /search/jql endpoint
    const queryParams = new URLSearchParams({
      jql: jql,
      startAt: (options.startAt || 0).toString(),
      maxResults: (options.maxResults || 50).toString(),
      fields: fields.join(',')
    });
    
    const data = await this.request(`/search/jql?${queryParams.toString()}`, {
      method: 'GET'
    });
    
    return {
      total: data.total || 0,
      startAt: data.startAt || 0,
      maxResults: data.maxResults || 0,
      issues: (data.issues || []).map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        statusCategory: issue.fields?.status?.statusCategory?.key,
        assignee: issue.fields?.assignee ? {
          id: issue.fields.assignee.accountId,
          name: issue.fields.assignee.displayName
        } : null,
        priority: issue.fields?.priority?.name,
        issueType: issue.fields?.issuetype?.name,
        parentKey: issue.fields?.parent?.key,
        updated: issue.fields?.updated,
        created: issue.fields?.created,
        url: `${this.siteUrl}/browse/${issue.key}`
      })) || []
    };
  }

  // ============================================================================
  // Comment Operations
  // ============================================================================

  /**
   * Get comments for an issue
   * @param {string} issueKeyOrId - Issue key or ID
   * @param {Object} options - Query options
   * @returns {Array} List of comments
   */
  async getIssueComments(issueKeyOrId, options = {}) {
    const params = new URLSearchParams({
      startAt: options.startAt || '0',
      maxResults: options.maxResults || '25',
      orderBy: '-created' // Most recent first
    });
    
    const response = await this.request(`/issue/${issueKeyOrId}/comment?${params.toString()}`);
    
    return {
      total: response.total,
      comments: response.comments?.map(comment => ({
        id: comment.id,
        author: {
          id: comment.author?.accountId,
          name: comment.author?.displayName
        },
        body: this.extractTextFromADF(comment.body),
        created: comment.created,
        updated: comment.updated
      })) || []
    };
  }

  // ============================================================================
  // Sprint Operations (if applicable)
  // ============================================================================

  /**
   * Get sprint for an issue (requires Jira Software)
   * @param {string} issueKey - Issue key
   * @returns {Object|null} Sprint data or null
   */
  async getIssueSprint(issueKey) {
    try {
      const issue = await this.request(`/issue/${issueKey}?fields=customfield_10020`);
      const sprints = issue.fields?.customfield_10020; // Standard sprint field
      
      if (!sprints || sprints.length === 0) {
        return null;
      }
      
      // Return the active or most recent sprint
      const activeSprint = sprints.find(s => s.state === 'active') || sprints[0];
      return {
        id: activeSprint.id,
        name: activeSprint.name,
        state: activeSprint.state
      };
    } catch (error) {
      // Sprint field may not be available
      return null;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Format description as Atlassian Document Format (ADF)
   * @param {string} text - Plain text or markdown
   * @returns {Object} ADF document
   */
  formatDescription(text) {
    if (!text) {
      return {
        type: 'doc',
        version: 1,
        content: []
      };
    }
    
    // Split text into paragraphs and format as ADF
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    const content = paragraphs.map(paragraph => {
      // Check if it's a list item
      const lines = paragraph.split('\n');
      const isUnorderedList = lines.every(line => /^[-*]\s/.test(line.trim()));
      const isOrderedList = lines.every(line => /^\d+\.\s/.test(line.trim()));
      
      if (isUnorderedList) {
        return {
          type: 'bulletList',
          content: lines.map(line => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: line.replace(/^[-*]\s/, '').trim()
              }]
            }]
          }))
        };
      }
      
      if (isOrderedList) {
        return {
          type: 'orderedList',
          content: lines.map(line => ({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: line.replace(/^\d+\.\s/, '').trim()
              }]
            }]
          }))
        };
      }
      
      // Check if it's a heading
      const headingMatch = paragraph.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        return {
          type: 'heading',
          attrs: { level: Math.min(headingMatch[1].length, 6) },
          content: [{
            type: 'text',
            text: headingMatch[2]
          }]
        };
      }
      
      // Check if it's a code block
      if (paragraph.startsWith('```')) {
        const codeContent = paragraph.replace(/```\w*\n?/, '').replace(/```$/, '');
        return {
          type: 'codeBlock',
          content: [{
            type: 'text',
            text: codeContent
          }]
        };
      }
      
      // Regular paragraph with inline formatting
      return {
        type: 'paragraph',
        content: this.parseInlineFormatting(paragraph)
      };
    });
    
    return {
      type: 'doc',
      version: 1,
      content
    };
  }

  /**
   * Parse inline formatting (bold, italic, code)
   * @param {string} text - Text to parse
   * @returns {Array} ADF content nodes
   */
  parseInlineFormatting(text) {
    const nodes = [];
    let currentText = '';
    let i = 0;
    
    while (i < text.length) {
      // Bold **text**
      if (text.slice(i, i + 2) === '**') {
        if (currentText) {
          nodes.push({ type: 'text', text: currentText });
          currentText = '';
        }
        const endBold = text.indexOf('**', i + 2);
        if (endBold !== -1) {
          nodes.push({
            type: 'text',
            text: text.slice(i + 2, endBold),
            marks: [{ type: 'strong' }]
          });
          i = endBold + 2;
          continue;
        }
      }
      
      // Inline code `code`
      if (text[i] === '`') {
        if (currentText) {
          nodes.push({ type: 'text', text: currentText });
          currentText = '';
        }
        const endCode = text.indexOf('`', i + 1);
        if (endCode !== -1) {
          nodes.push({
            type: 'text',
            text: text.slice(i + 1, endCode),
            marks: [{ type: 'code' }]
          });
          i = endCode + 1;
          continue;
        }
      }
      
      currentText += text[i];
      i++;
    }
    
    if (currentText) {
      nodes.push({ type: 'text', text: currentText });
    }
    
    return nodes.length > 0 ? nodes : [{ type: 'text', text: text }];
  }

  /**
   * Extract plain text from ADF document
   * @param {Object} adf - ADF document
   * @returns {string} Plain text
   */
  extractTextFromADF(adf) {
    if (!adf || typeof adf === 'string') {
      return adf || '';
    }
    
    const extractContent = (node) => {
      if (!node) return '';
      
      if (node.type === 'text') {
        return node.text || '';
      }
      
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractContent).join('');
      }
      
      return '';
    };
    
    if (adf.content && Array.isArray(adf.content)) {
      return adf.content.map(extractContent).join('\n');
    }
    
    return extractContent(adf);
  }

  /**
   * Map Haven7 priority to Jira priority name
   * @param {string} priority - Haven7 priority
   * @returns {string} Jira priority name
   */
  mapPriority(priority) {
    const mapping = {
      'lowest': 'Lowest',
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'highest': 'Highest'
    };
    return mapping[priority?.toLowerCase()] || 'Medium';
  }

  /**
   * Map Jira status to Haven7 status category
   * @param {string} status - Jira status name
   * @param {string} category - Jira status category key
   * @returns {string} Haven7 status category
   */
  mapStatusCategory(status, category) {
    // Check for specific statuses first
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('blocked')) {
      return 'blocked';
    }
    
    if (statusLower.includes('qa') || statusLower.includes('review') || statusLower.includes('testing')) {
      return 'qa';
    }
    
    // Fall back to category
    switch (category) {
      case 'new':
      case 'undefined':
        return 'todo';
      case 'indeterminate':
        return 'in_progress';
      case 'done':
        return 'done';
      default:
        return 'todo';
    }
  }

  /**
   * Build deep link to Jira issue
   * @param {string} issueKey - Issue key
   * @returns {string} Full URL
   */
  buildIssueUrl(issueKey) {
    return `${this.siteUrl}/browse/${issueKey}`;
  }

  /**
   * Build JQL for finding issues related to a PRD
   * @param {string} projectKey - Project key
   * @param {Array} issueKeys - List of issue keys
   * @returns {string} JQL query
   */
  buildPRDIssuesJQL(projectKey, issueKeys) {
    if (issueKeys && issueKeys.length > 0) {
      return `key in (${issueKeys.map(k => `"${k}"`).join(',')})`;
    }
    return `project = "${projectKey}" ORDER BY created DESC`;
  }
}

