import OpenAI from 'openai';

/**
 * WireframeAnalysisService - Analyzes wireframe images using GPT-4 Vision
 * to generate detailed Requirements sections for PRDs
 */
export class WireframeAnalysisService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.model = 'gpt-4o'; // GPT-4 with vision support
  }

  /**
   * Generate detailed Requirements section from wireframe image
   * @param {string} wireframeBase64 - Base64 encoded image
   * @param {Object} context - User's PRD context (objective, background, scope)
   * @param {Array} retrievedChunks - RAG chunks for domain-specific patterns
   * @returns {Promise<{requirements: string, confidence: number, metadata: Object}>}
   */
  async generateRequirements(wireframeBase64, context = {}, retrievedChunks = []) {
    const systemPrompt = `You are a senior Product Manager analyzing a wireframe to generate detailed Requirements.

Your output must follow this exact structure:

**4. Requirements**

### A. Functional Requirements
- FR-1: [High-level capability]
- FR-2: [High-level capability]

### B. Detailed UI/UX Specification

#### **[Component Name]**
**Visual Placement:** [Where it appears on screen]
**UI Elements:** [Buttons, inputs, text, icons]
**User Interaction:** [What happens when user interacts]
**States:** [Default, hover, active, disabled, loading, error]
**Copy:** [Exact button text, labels, error messages]

[Continue for each UI component in the wireframe]

### C. Non-Functional Requirements
- NFR-1: [Performance target]
- NFR-2: [Security requirement]
- NFR-3: [Accessibility requirement]

Rules:
1. Be extremely detailed about every button, input, modal, tooltip
2. Document all states (default, hover, loading, error, success)
3. Extract any text visible in the wireframe (button labels, titles, tooltips)
4. Infer user flows from arrows or annotations in the wireframe
5. If wireframe is hand-drawn, interpret shapes: rectangles = buttons, circles = icons, lines = dividers
6. Use context from Objective, Background, Scope to make Requirements feature-specific (not generic)
7. If retrieved chunks contain similar UI patterns, reference them
8. Include exact copy for all UI elements (buttons, labels, tooltips, error messages)
9. Document edge cases and error states for each component
10. Specify validation rules and conditional logic`;

    const userPrompt = `Analyze this wireframe and generate detailed Requirements.

Context:
- Objective: ${context.objective || 'Not provided'}
- Background: ${context.background || 'Not provided'}
- Scope: ${context.scope || 'Not provided'}

${retrievedChunks.length > 0 ? `
Retrieved patterns from workspace:
${retrievedChunks.map((chunk, i) => `[${i+1}] ${chunk.content || chunk.snippet || ''}`).join('\n')}
` : ''}

Generate the Requirements section now.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${wireframeBase64}`,
                  detail: 'high' // Request high-detail analysis
                }
              }
            ]
          }
        ],
        max_tokens: 4000, // Requirements can be long
        temperature: 0.3 // Low temperature for structured output
      });

      const requirements = response.choices[0]?.message?.content || '';
      
      // Assess confidence based on content quality
      const confidence = this.assessConfidence(requirements, context, retrievedChunks);
      
      // Extract metadata from the analysis
      const metadata = {
        components_detected: this.countComponents(requirements),
        has_functional_requirements: requirements.includes('### A. Functional Requirements'),
        has_ui_specification: requirements.includes('### B. Detailed UI/UX Specification'),
        has_nonfunctional_requirements: requirements.includes('### C. Non-Functional Requirements'),
        word_count: requirements.split(/\s+/).length,
        analyzed_at: new Date().toISOString()
      };

      return {
        requirements,
        confidence,
        metadata
      };
    } catch (error) {
      console.error('Wireframe analysis error:', error);
      throw new Error(`Failed to analyze wireframe: ${error.message}`);
    }
  }

  /**
   * Assess confidence score for generated requirements
   * @param {string} requirements - Generated requirements text
   * @param {Object} context - User context
   * @param {Array} retrievedChunks - RAG chunks
   * @returns {number} - Confidence score 0-100
   */
  assessConfidence(requirements, context, retrievedChunks) {
    let confidence = 50; // Base confidence

    // Increase confidence for structured content
    if (requirements.includes('### A. Functional Requirements')) confidence += 10;
    if (requirements.includes('### B. Detailed UI/UX Specification')) confidence += 15;
    if (requirements.includes('### C. Non-Functional Requirements')) confidence += 5;

    // Increase confidence if multiple components are documented
    const componentCount = this.countComponents(requirements);
    confidence += Math.min(componentCount * 3, 20); // Up to +20 for components

    // Increase confidence if exact copy is included
    const hasCopy = requirements.includes('**Copy:**') || requirements.includes('Label:') || requirements.includes('Text:');
    if (hasCopy) confidence += 10;

    // Increase confidence if states are documented
    const hasStates = requirements.includes('**States:**') || requirements.includes('Default:') || requirements.includes('Loading:');
    if (hasStates) confidence += 10;

    // Increase confidence if user flows are present
    const hasFlows = requirements.includes('User Flow:') || requirements.includes('1.') || requirements.includes('Step ');
    if (hasFlows) confidence += 5;

    // Increase confidence for context usage
    if (context.objective && requirements.toLowerCase().includes(context.objective.toLowerCase().substring(0, 20))) {
      confidence += 5;
    }

    // Increase confidence if RAG chunks were used
    if (retrievedChunks.length > 0) {
      confidence += Math.min(retrievedChunks.length * 2, 10);
    }

    // Decrease confidence for very short requirements
    const wordCount = requirements.split(/\s+/).length;
    if (wordCount < 100) confidence -= 20;
    else if (wordCount < 200) confidence -= 10;

    // Cap at 100
    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Count UI components documented in requirements
   * @param {string} requirements - Requirements text
   * @returns {number} - Component count
   */
  countComponents(requirements) {
    // Count markdown headers that likely represent components
    const componentHeaders = requirements.match(/####\s+\*\*[^*]+\*\*/g) || [];
    return componentHeaders.length;
  }

  /**
   * Regenerate requirements for existing PRD with all context
   * @param {string} wireframeBase64 - Base64 encoded image
   * @param {Object} existingPRD - Existing PRD with all sections
   * @param {Array} retrievedChunks - RAG chunks
   * @returns {Promise<{requirements: string, confidence: number, metadata: Object}>}
   */
  async regenerateRequirements(wireframeBase64, existingPRD = {}, retrievedChunks = []) {
    const context = {
      objective: existingPRD.objective || '',
      background: existingPRD.background || '',
      scope: existingPRD.scope || '',
      existing_requirements: existingPRD.requirements || ''
    };

    // Enhanced prompt for regeneration with existing context
    const systemPrompt = `You are a senior Product Manager analyzing a wireframe to regenerate detailed Requirements for an existing PRD.

The user has an existing PRD with some requirements already documented. Your task is to:
1. Analyze the wireframe thoroughly
2. Generate comprehensive Requirements that incorporate the wireframe details
3. Maintain consistency with the existing PRD context
4. Enhance or replace vague requirements with specific wireframe-based details

Your output must follow this exact structure:

**4. Requirements**

### A. Functional Requirements
- FR-1: [High-level capability from wireframe]
- FR-2: [High-level capability from wireframe]

### B. Detailed UI/UX Specification

#### **[Component Name from wireframe]**
**Visual Placement:** [Exact location on screen]
**UI Elements:** [All buttons, inputs, labels, icons visible]
**User Interaction:** [Click/tap/keyboard behavior]
**States:** [Default, hover, active, disabled, loading, error, success]
**Copy:** [Exact text from wireframe - buttons, labels, tooltips, error messages]
**Validation:** [Rules for inputs, error messages]

[Continue for EVERY component visible in the wireframe]

### C. Non-Functional Requirements
- NFR-1: [Performance targets]
- NFR-2: [Security requirements]
- NFR-3: [Accessibility requirements]

Rules:
1. Document EVERY visible UI element in the wireframe
2. Extract ALL text visible (button labels, titles, tooltips, error messages)
3. Infer user flows from layout and component relationships
4. If hand-drawn: rectangles = buttons/panels, circles = icons, lines = dividers/flows
5. Use existing PRD context to make requirements feature-specific
6. Reference similar patterns from retrieved chunks if available
7. Be exhaustive - engineering should be able to build from this spec alone`;

    const userPrompt = `Analyze this wireframe and regenerate detailed Requirements for an existing PRD.

Existing PRD Context:
- Objective: ${context.objective || 'Not provided'}
- Background: ${context.background || 'Not provided'}
- Scope: ${context.scope || 'Not provided'}
${context.existing_requirements ? `
- Current Requirements: ${context.existing_requirements.substring(0, 500)}... [truncated]
` : ''}

${retrievedChunks.length > 0 ? `
Retrieved patterns from workspace:
${retrievedChunks.map((chunk, i) => `[${i+1}] ${chunk.content || chunk.snippet || ''}`).join('\n')}
` : ''}

Generate comprehensive Requirements section from the wireframe now.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${wireframeBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      });

      const requirements = response.choices[0]?.message?.content || '';
      const confidence = this.assessConfidence(requirements, context, retrievedChunks);
      
      const metadata = {
        components_detected: this.countComponents(requirements),
        has_functional_requirements: requirements.includes('### A. Functional Requirements'),
        has_ui_specification: requirements.includes('### B. Detailed UI/UX Specification'),
        has_nonfunctional_requirements: requirements.includes('### C. Non-Functional Requirements'),
        word_count: requirements.split(/\s+/).length,
        regenerated_from_existing: !!context.existing_requirements,
        analyzed_at: new Date().toISOString()
      };

      return {
        requirements,
        confidence,
        metadata
      };
    } catch (error) {
      console.error('Wireframe regeneration error:', error);
      throw new Error(`Failed to regenerate requirements: ${error.message}`);
    }
  }
}

