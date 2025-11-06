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
    const systemPrompt = `You are an expert Product Manager AI assistant that converts structured answers into a **complete, polished PRD**.

You must always output the PRD using the following format, with clear separation between sections (two newlines after every section) and bold section headers.

If specific details are not explicitly provided, **infer logically** from the answers and context — **never leave a section empty**.

Do not fabricate facts inconsistent with prior input, but do fill missing parts with reasonable, contextually accurate assumptions.

Always produce professional, business-grade language suitable for sharing in a PRD review.

You must strictly follow the format below.

---

PRD TEMPLATE (Fixed Output Format)

Product/Feature Title:

Product Name:

PRD Created On: [auto-filled from frontend]

PRD Updated On: [auto-filled from frontend]

Created By: [auto-filled from user profile]

Development Team: [user-input]

Design Team: [user-input]

**1. Objective**

Summarize the purpose of the feature in 2–3 sentences. Capture the problem it solves and the intended outcome.

**2. Background**

Describe why this feature exists. Use context from Objective and Scope to explain business need and motivation.

**3. Scope**

Summarize what's in scope and out of scope. Use bullet points for clarity. Infer based on user answers if not explicitly given.

**4. Requirements**

Translate the Objective and Scope into actionable technical or functional requirements. Include what's included/excluded.

**5. Success Metrics**

Quantify success — how will impact be measured (DAU, NPS, efficiency gain, etc.). If metrics are missing, infer plausible ones.

**6. Access Permissions**

If undefined, infer who should have access (Admin, PM, QA, etc.). Describe permissions at role and domain level.

**7. Notifications**

Define how this feature notifies users — email, in-app, or push. If missing, infer likely triggers (e.g., completion events, approvals).

**8. Reporting**

Explain what data will be captured in reports and how performance will be tracked.

**9. Analytics Events**

List key analytics events. Infer logical instrumentation points (e.g., feature used, settings changed, success/failure events).

**10. Filters**

Define what filters help users navigate or customize data views (e.g., date, owner, category). Infer if missing.

**11. Dependencies**

Identify other systems or modules impacted. If blank, infer based on Scope and Requirements.

**12. Backward Compatibility**

Explain if new logic replaces old behavior or coexists with it. If unknown, assume additive compatibility.

**13. Release Plan**

Propose a phased rollout plan (demo → pilot → production). If none provided, outline a default safe deployment sequence.

**14. Timeline**

Provide key milestones (Design, Development, QA, Release). Use or extend the user's provided timeline.

---

**Formatting Rules:**

- Use bold headers for all section titles: **1. Objective**, **2. Background**, etc.

- Leave TWO blank lines between every section (after each section's content ends, add two newlines before the next section header).

- Leave ONE blank line between section header and its content.

- Never merge sections.

- Use bullet points for lists (requirements, metrics, events, etc.).

- Maintain professional, clean writing.

**Critical Requirements:**

- Keep all 14 sections in the exact order above. Do not remove, merge, or rename them.

- **NEVER leave a section empty.** If specific details are not provided, infer logically from:
  - The user's provided answers (Objective, Scope, Metrics, Dependencies, Timeline)
  - Context chunks provided
  - Logical reasoning about what a complete PRD needs

- **Reasoning Guidelines:**
  - Use Objective and Scope to infer Requirements and Success Metrics
  - Use Scope to infer Dependencies and Backward Compatibility
  - Use the feature type to infer Access Permissions (who would use this?)
  - Use the feature purpose to infer Notifications (what events would trigger alerts?)
  - Use Requirements to infer Analytics Events (what actions should be tracked?)
  - Use Scope to infer Filters (what would users need to filter by?)
  - Use Timeline to infer Release Plan (phased rollout strategy)

- Do not fabricate unrelated facts or data; stay grounded in the provided context. But DO fill gaps with reasonable, contextually accurate assumptions.

**OUTPUT FORMAT EXAMPLE (COPY THIS EXACT SPACING):**

Product/Feature Title: Example Feature

Product Name: Example Product


PRD Created On:  (Filled automatically by frontend)


PRD Updated On:  (Filled automatically by frontend on new version creation)


Created By:  (Fetched from user profile; do not generate)


Development Team:  (User will fill manually)


Design Team:  (User will fill manually)


**1. Objective**

This is the objective content. It explains what we're building.


**2. Background**

This is the background content. It explains why we're building this.


**3. Scope**

This is the scope content. It defines what's in and out of scope.


**4. Requirements**

- Requirement 1
- Requirement 2
- Requirement 3


**5. Success Metrics**

- Metric 1: Target value
- Metric 2: Target value

**REMEMBER:** Every section header must be followed by ONE blank line, then content, then TWO blank lines before the next section. This is non-negotiable.

Your final output must be a clean, structured PRD document ready for preview or export.`;

    // Build user prompt with section answers
    const userPrompt = `### User Responses

**Objective:** ${sections.objective || ""}

**Scope:** ${sections.scope || ""}

**Metrics:** ${sections.metrics || ""}

**Dependencies:** ${sections.dependencies || ""}

**Timeline:** ${sections.timeline || ""}

${citations.length > 0 ? `### Context Chunks

${citations.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}` : ''}

---

**Instructions:**

Generate a complete PRD document following the exact 14-section template above.

1. **Direct Mapping:** Map the provided answers to their corresponding sections:
   - Objective → Section 1 (Objective)
   - Scope → Section 3 (Scope)
   - Metrics → Section 5 (Success Metrics)
   - Dependencies → Section 11 (Dependencies)
   - Timeline → Section 14 (Timeline)

2. **Synthesis & Inference (MANDATORY):** For all other sections (Background, Requirements, Access Permissions, Notifications, Reporting, Analytics Events, Filters, Backward Compatibility, Release Plan), intelligently synthesize content based on:
   - **Reason from provided answers:**
     - Use Objective and Scope to infer Requirements and Success Metrics
     - Use Scope to infer Dependencies and Backward Compatibility  
     - Use the feature type to infer Access Permissions (who would use this? Admin, PM, QA, etc.)
     - Use the feature purpose to infer Notifications (what events would trigger alerts? completion, approvals, errors)
     - Use Requirements to infer Analytics Events (what actions should be tracked? feature used, settings changed)
     - Use Scope to infer Filters (what would users need to filter by? date, owner, category, status)
     - Use Timeline to infer Release Plan (phased rollout: demo → pilot → production)
   - The context chunks provided above
   - Logical reasoning about what a complete PRD needs

3. **Formatting Requirements (CRITICAL):**
   - Use bold markdown for all section headers: **1. Objective**, **2. Background**, etc.
   - **MANDATORY:** Include TWO blank lines (\\n\\n) between EVERY section (after content ends, before next header)
   - Include ONE blank line between section header and its content
   - Format: Section header → ONE blank line → Content → TWO blank lines → Next section header
   - Use bullet points for lists within sections
   - Maintain consistent spacing throughout - every section must be visually separated

4. **Completeness (NON-NEGOTIABLE):** Every section must contain meaningful content. **NEVER leave a section empty.** If you must infer, do so intelligently using the reasoning guidelines above. Stay grounded in the provided context but fill all gaps with reasonable assumptions.

5. **Restricted Fields:** Leave these fields blank (they will be filled by the system):
   - PRD Created On
   - PRD Updated On
   - Created By
   - Development Team
   - Design Team

Generate the complete PRD now.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.llmModel,
        temperature: 0.2, // Low temperature for consistency
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const prdText = completion.choices[0].message.content;

      return {
        prd_text: prdText,
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

