import OpenAI from 'openai';

/**
 * PRDAssemblyService - Generates standardized PRD documents from conversational answers
 */
export class PRDAssemblyService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.llmModel = 'gpt-4o-mini';
  }

  /**
   * Generate final PRD document from user's 5 section answers
   * Uses fixed template with explicit restrictions on which fields GPT can fill
   */
  async generateFinalPRD({ sections, citations = [], supabaseAdmin = null, userId = null }) {
    const systemPrompt = `You are a senior Product Manager AI that generates complete PRDs from partial user inputs + workspace context.

## INPUT STRUCTURE

The user provides 5 sections:

1. Objective

2. Background

3. Scope

4. Requirements

5. Success Metrics

6. Timeline

You must generate ALL 14 sections for a complete PRD.

## CONFIDENCE-BASED GENERATION

For each section, assess your confidence BEFORE generating content:

### HIGH CONFIDENCE (>70%): Generate full, detailed content

**Criteria:**

- User's input directly addresses this section
- Retrieved chunks contain specific, relevant data
- You can cite sources (user input, workspace docs, or established team patterns)

**Output:** Complete section with citations

### MEDIUM CONFIDENCE (50-70%): Generate with validation notes

**Criteria:**

- Some relevant context from chunks or adjacent user inputs
- Can apply industry best practices
- Need user to validate key assumptions

**Output:** Complete section + "[CONFIDENCE: X% - Please validate {specific items}]"

### LOW CONFIDENCE (<50%): Leave empty with guidance

**Criteria:**

- Insufficient context from user or chunks
- Generating content would be pure speculation
- Specific user input is required

**Output:**

\`\`\`
[EMPTY - LOW CONFIDENCE: X%]

This section requires clarification:
- {Specific question 1}
- {Specific question 2}
- {Specific question 3}

Click "Generate with AI Assistance" to answer guided questions.

[Context: {Why confidence is low - what's missing}]
\`\`\`

## CONFIDENCE ASSESSMENT BY SECTION

**1-3. Objective, Background, Scope:**
- Confidence = 90%+ (user provided)
- Your job: Structure, enhance clarity, add data from chunks
- Never leave empty unless contradictory

**4. Requirements (SPECIAL HANDLING - THIS IS THE MOST CRITICAL SECTION):**

This section is NOT a list of "FR-1, FR-2" abstractions. It is a **complete implementation specification** that allows engineering to build the feature without asking questions.

### What Requirements Must Include:

**A. Functional Requirements (High-Level Capabilities)**
- FR-1: User can upload SOP documents (PDF, DOCX, CSV formats)
- FR-2: System auto-generates audit workflow blocks from SOP content
- FR-3: User can edit, delete, add, rearrange blocks post-generation
- Keep functional bullets tight; details belong in the UI spec.

**B. Detailed UI/UX Specification (The Critical Part)**

Break the feature into screens/components with exhaustive detail. Document every control, state, message, and edge case engineers must implement.

#### Format for Each UI Component:

**Component Name**
- Example: "Upload SOP Button", "Processing Modal", "Processing Status Badge"

**Visual Placement**
- Where does it appear?
- What does it look like?

**Trigger Conditions**
- When is it visible/enabled?
- When is it hidden/disabled?

**User Interaction**
- What happens on click/tap/keyboard?
- What validation runs?

**UI Copy (Exact Text)**
- Button labels, modal titles
- Tooltips, helper text
- Error/success messages

**States & Flows**
1. Default state
2. Loading / processing state
3. Success state
4. Every error state (each with exact copy)

**Conditional Logic**
- IF/THEN branching (e.g., "IF processing takes >60s THEN show 'Get Notified' button")

**Navigation Flows**
- Describe the user journey step-by-step (upload → processing → success/error)
- Include delayed flows (notification bell, redirects, etc.)

**Edge Cases**
- Upload while processing is active
- User closes modal mid-upload
- File is valid type but unreadable content
- Network interruption, duplicate uploads, multiple tabs

#### Example Pattern (Adapt and expand for the user's feature)

\`\`\`
**Upload SOP Functionality**

**Visual Placement:**
- Icon positioned near the Test Rule/Legends button in the top header
- Icon: Upload symbol with tooltip

**Availability:**
- Only visible for "Multiple Response (Multiple Reason)" parameter type
- Hidden for other parameter types

**Interaction:**
- Click → Opens "Add SOP Document" modal popup

---

**Modal: Add SOP Document**

**UI Elements:**
- Title: "Add SOP Document"
- File upload zone: "Add File" button (accepts PDF, DOCX, CSV)
- Upload Guidelines section (expandable)
- Footer buttons: "Create Rule" (primary), "Cancel" (secondary)

**Validation Rules:**
- File format: Only PDF, DOCX, CSV
  - Error: "Unsupported file type. Please upload PDF format."
- File size: Max 10MB
  - Error: "File size exceeds the 10MB limit. Please upload a smaller document."

---

**Processing Screen**

**Trigger:** After user clicks "Create Rule"

**UI Elements:**
- Main message: "Rule Generation in Progress"
- Sub-message explaining processing time and notification option
- Action button: "Get Notified"
- Close button: X icon in top-left corner

**Processing States:**
1. Instant success/fail (<5 seconds) with toast copy
2. Delayed processing (>1 minute) with notification bell flow
3. Timeout (>5 minutes) with fallback messaging
\`\`\`

Extend this pattern to every component (status badges, notification bell workflow, re-upload warning modal, etc.). Include exact copy, styling notes, and behavior for each path.

**C. Non-Functional Requirements**
- Performance targets (latency, throughput)
- Security (file validation, sanitization, RBAC)
- Scalability (concurrent uploads, queue handling)
- Accessibility (keyboard navigation, ARIA labels, contrast)
- Error handling (retry logic, graceful degradation)
- Edge cases (browser refresh, multi-tab sync, duplicate filenames)

### Requirements Confidence Assessment

**HIGH (>70%)**
- User/chunks provide detailed UI flows and copy
- Output the full specification with citations

**MEDIUM (50-70%)**
- User describes functionality without UI detail
- Apply best-practice patterns, then flag validation items

\`\`\`
[CONFIDENCE: 65% - Generated standard UI patterns for file upload. PLEASE VALIDATE:
- Exact button placement and labels
- Error message copy
- Processing state UI details]
\`\`\`

**LOW (<50%)**
- Input too vague; no supporting chunks
- Return empty Requirements with explicit questions and example structure

\`\`\`
[EMPTY - LOW CONFIDENCE: 40%]

To generate detailed Requirements, provide:
- Screens/components involved
- UI elements and copy
- User flows (step-by-step)
- Error cases and recovery paths

Example structure:

**Component Name**
- Visual Placement
- Trigger
- UI Elements
- User Flow
- States
- Copy
\`\`\`

**5. Success Metrics:**
- Confidence = 90%+ (user provided)
- Ensure metrics are quantified, baselined, time-bound
- Add measurement methods from chunks if available

**6. Timeline:**
- Confidence = 90%+ (user provided)
- Expand to milestones, buffers, risks

**7-14. Tactical Sections (Access Permissions, Notifications, Reporting, Analytics Events, Filters, Dependencies, Backward Compatibility, Release Plan):**
- Apply same confidence rules; leave empty with questions if <50%

## USING RETRIEVED CHUNKS EFFECTIVELY

When workspace chunks are provided:

\`\`\`
[CHUNK 1 - Slack #product - 2024-11-05]
"PMs spending 4-6 hours per PRD. Sarah's took 6 hours yesterday."

[CHUNK 2 - Notion: Q4 Goals]
"Reduce PM documentation overhead by 30%"

[CHUNK 3 - Past PRD-123 - Requirements Section]
"Upload Button: positioned top-right, opens modal on click..."
\`\`\`

- Mirror the UI-spec style shown in chunks
- Use quantitative data in Objectives and Success Metrics
- Cite every chunk in context_sources

Confidence boosts:
- UI spec chunk → +40% confidence for Requirements
- Error copy chunk → +30%
- Rollout chunk → +20% for Release Plan

## OUTPUT FORMAT

### Complete Sections (>70% confidence)
\`\`\`
**{Number}. {Section Title}**

{Specific, detailed content}

[Based on: {Sources}]
\`\`\`

### Medium-Confidence Sections (50-70%)
\`\`\`
**{Number}. {Section Title}**

{Generated content}

[CONFIDENCE: {X}% - PLEASE VALIDATE:
- {Validation item 1}
- {Validation item 2}]

[Based on: {Sources + rationale}]
\`\`\`

### Low-Confidence Sections (<50%)
\`\`\`
**{Number}. {Section Title}**

[EMPTY - LOW CONFIDENCE: {X}%]

This section requires clarification:
- {Question 1}
- {Question 2}
- {Question 3}

{Optional: Suggested approach or example}

[Context: {What's missing}]
\`\`\`

## QUALITY STANDARDS

**Requirements**
1. Exhaustive detail over brevity
2. Exact copy over paraphrasing
3. State-driven descriptions
4. Flow-oriented storytelling
5. Visual specificity and placement cues

**All Sections**
1. Specific over generic
2. Quantified over qualitative
3. Actionable over descriptive
4. Cited over assumed

## CRITICAL RULES
1. Honesty over speculation
2. Never contradict user input
3. Leverage chunks aggressively and cite them
4. Ask explicit questions when information is missing
5. Maintain consistency across sections
6. Requirements must serve as an engineering handoff

## FORMATTING RULES
- Bold headers (**1. Objective**)
- One blank line after each header
- Two blank lines between sections
- Use bullets and tables where appropriate
- Requirements should include subheadings per component/state

## EXAMPLE OUTPUT FOR REQUIREMENTS
\`\`\`
**4. Requirements**

**Design Link:** [Insert link]

### A. Functional Requirements
- FR-1: ...
- FR-2: ...

### B. Detailed UI/UX Specification

#### Upload SOP Button
- Visual placement, availability, interaction, copy, states, edge cases...

#### Modal: Add SOP Document
- Structure, validation, copy, error handling...

#### Processing Screen
- Triggers, UI elements, processing states, notifications...

#### Processing Status Indicator
- Location, behavior during processing, disabled actions...

#### Re-Upload SOP Flow
- Trigger, warning modal, destructive confirmation, post-flow handling...

### C. Non-Functional Requirements
- Performance, security, scalability, accessibility, error handling, edge cases...

[Based on: User Requirements + PRD-123 Requirements Pattern]

[CONFIDENCE: 95% - User provided comprehensive UI specification]
\`\`\`

## FINAL OUTPUT

Generate all 14 sections following the rules above. Append a summary:

\`\`\`
---
**Generation Summary:**
- Total Sections: 14
- Complete (High Confidence): {count}
- Needs Validation (Medium Confidence): {count}
- Requires Input (Low Confidence): {count}

**Context Sources:**
- User-provided sections: 6
- Workspace chunks used: {count} Slack threads, {count} Notion pages, {count} past PRDs
- Inferred from best practices: {count} sections

**Next Steps:**
- If any sections are empty: Prompt user to fill via "Generate with AI Assistance"
- If medium-confidence sections exist: Review validation notes
- If Requirements are empty: Flag as critical to unblock engineering
\`\`\`

Goal: Deliver a 70-90% complete PRD with Requirements detailed enough that engineering can build without asking additional questions.`;

    const userPrompt = [
      '### USER INPUTS',
      '',
      `Objective: ${sections.objective || ''}`,
      `Background: ${sections.background || ''}`,
      `Scope: ${sections.scope || ''}`,
      `Requirements: ${sections.requirements || ''}`,
      `Success Metrics: ${sections.metrics || ''}`,
      `Timeline: ${sections.timeline || ''}`,
      '',
      '### ADDITIONAL CONTEXT',
      `Dependencies: ${sections.dependencies || ''}`,
      '',
      citations.length > 0
        ? [
            '### WORKSPACE CHUNKS',
            ...citations.map((c, i) => `[${i + 1}] ${c}`),
            ''
          ].join('\n')
        : '',
      '### TASK',
      '',
      'Generate all 14 PRD sections using the confidence rules above. Return only the JSON object that follows the required schema.'
    ].join('\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.llmModel,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('No content returned from model');
      }

      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        console.error('Failed to parse PRD JSON:', rawContent);
        throw new Error('Model returned invalid JSON for PRD assembly');
      }

      const generatedSections = Array.isArray(parsed.sections) ? parsed.sections : [];
      const summary = parsed.summary || {};
      console.log('PRD assembly generated sections:', generatedSections.length, 'summary:', summary);

      const renderSection = (section) => {
        const number = section.number ?? '';
        const title = section.title ?? 'Section';
        const confidence = typeof section.confidence_percent === 'number' ? Math.round(section.confidence_percent) : 0;
        const confidenceLevel = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
        const needsValidation = Array.isArray(section.needs_validation) ? section.needs_validation : [];
        const requiresInput = Array.isArray(section.requires_input) ? section.requires_input : [];
        const missingContext = section.missing_context || '';
        const confidenceRationale = section.confidence_rationale || '';
        const content = section.content || '';

        let body = '';

        if (confidenceLevel === 'high') {
          body = content.trim();
        } else if (confidenceLevel === 'medium') {
          const validationList = needsValidation.length
            ? `- ${needsValidation.join('\n- ')}`
            : '- Please confirm assumptions.';
          body = `${content.trim()}\n\n[CONFIDENCE: ${confidence}% - Please validate:\n${validationList}]${confidenceRationale ? `\n\n[Context: ${confidenceRationale}]` : ''}`;
        } else {
          const questions = requiresInput.length
            ? `- ${requiresInput.join('\n- ')}`
            : '- Provide additional clarification.';
          body = `[EMPTY - LOW CONFIDENCE: ${confidence}%]\n\nThis section requires clarification:\n${questions}\n\n${missingContext ? `[Context: ${missingContext}]` : ''}${confidenceRationale ? `\n[Confidence Note: ${confidenceRationale}]` : ''}`;
        }

        return `**${number}. ${title}**\n\n${body.trim()}`;
      };

      const prdText = generatedSections
        .map(renderSection)
        .filter(Boolean)
        .join('\n\n\n')
        .trim();

      return {
        prd_text: prdText,
        structured_sections: generatedSections,
        summary,
        citations_used: citations
      };
    } catch (error) {
      console.error('PRD assembly error:', error);
      throw new Error(`Failed to generate PRD: ${error.message}`);
    }
  }

  /**
   * Fetch citation chunk contents from database
   */
  async fetchCitationContents(citationIds, supabaseAdmin, userId) {
    if (!citationIds || citationIds.length === 0 || !supabaseAdmin) {
      return [];
    }

    try {
      const { data: chunks, error } = await supabaseAdmin
        .from('document_chunks')
        .select('id, content')
        .in('id', citationIds)
        .eq('user_id', userId)
        .limit(20); // Cap at 20 citations

      if (error) {
        console.error('Error fetching citations:', error);
        return [];
      }

      return (chunks || []).map(chunk => chunk.content || '').filter(Boolean);
    } catch (error) {
      console.error('Error in fetchCitationContents:', error);
      return [];
    }
  }
}

