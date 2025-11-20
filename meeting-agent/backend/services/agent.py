import os
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List
from models.extraction import MeetingInsights
from services.action_dispatcher import AgentAction
import json

class AgentPlan(BaseModel):
    actions: List[AgentAction] = Field(..., description="List of actions to execute")
    reasoning: str = Field(..., description="Explanation of why these actions were chosen")

class AgentService:
    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"

    async def plan_actions(self, user_id: str, insights: MeetingInsights, meeting_title: str = "Untitled Meeting") -> AgentPlan:
        """
        Analyzes meeting insights and proposes a plan of actions.
        """
        
        system_prompt = """
        You are an autonomous Meeting Agent. Your goal is to operationalize meeting outcomes.
        
        Input: Structured Meeting Insights (Action Items, Decisions, etc.)
        Output: A list of concrete actions to take (Create Task, Send Slack, Create Notion Page).
        
        Available Tools:
        1. create_task(content, due_string, meeting_title, assignee_name, source_quote, priority): Create a task in Todoist.
           - content: The task description (keep concise, under 85 characters)
           - due_string: Due date in natural language (e.g., "tomorrow", "next Friday", "2024-12-31")
           - meeting_title: The title of the meeting this action came from
           - assignee_name: Name of the person assigned (from action item assignee field)
           - source_quote: Additional context from the action item (from source_quote field)
           - priority: 2 for normal, 3 for high priority
        2. send_slack(channel_id, text): Send a message to Slack.
        3. create_page(parent_page_id, title, content): Create a Notion page.
        
        Rules:
        - For every Action Item, create a Todoist task with all available metadata.
        - Include meeting_title, assignee_name, and source_quote from the action item.
        - Set priority to 3 (high) if the action item mentions urgency, deadlines, or critical items.
        - Set priority to 2 (normal) for regular action items.
        - If there are critical Decisions, draft a Slack summary.
        - If there is a request for a document, draft a Notion page.
        - Always include the user_id provided in the context.
        """
        
        # Convert insights to text for the prompt
        insights_text = json.dumps(insights.model_dump(), indent=2)
        
        # Build user message with meeting title
        user_message = f"User ID: {user_id}\nMeeting Title: {meeting_title}\n\nInsights:\n{insights_text}"
        
        print(f"🤖 Generating action plan for meeting: {meeting_title}")
        print(f"📊 Action items count: {len(insights.action_items)}")
        
        try:
            # Use regular chat completion and parse JSON manually (structured outputs is too strict for Dict[str, Any])
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt + "\n\nIMPORTANT: Respond with valid JSON matching this structure: {\"actions\": [{\"type\": \"create_task\", \"params\": {...}, \"user_id\": \"...\"}], \"reasoning\": \"...\"}"},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"}
            )
            
            response_text = completion.choices[0].message.content
            print(f"📝 Raw response: {response_text[:200]}...")
            
            plan_data = json.loads(response_text)
            plan = AgentPlan(**plan_data)
            
            print(f"✅ Generated plan with {len(plan.actions)} actions")
            return plan
        except Exception as e:
            print(f"❌ Error generating plan: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            raise
