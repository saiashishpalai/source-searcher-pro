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

    async def plan_actions(self, user_id: str, insights: MeetingInsights) -> AgentPlan:
        """
        Analyzes meeting insights and proposes a plan of actions.
        """
        
        system_prompt = """
        You are an autonomous Meeting Agent. Your goal is to operationalize meeting outcomes.
        
        Input: Structured Meeting Insights (Action Items, Decisions, etc.)
        Output: A list of concrete actions to take (Create Task, Send Slack, Create Notion Page).
        
        Available Tools:
        1. create_task(content, due_string): Create a task in Todoist.
        2. send_slack(channel_id, text): Send a message to Slack.
        3. create_page(parent_page_id, title, content): Create a Notion page.
        
        Rules:
        - For every Action Item, create a Todoist task.
        - If there are critical Decisions, draft a Slack summary.
        - If there is a request for a document, draft a Notion page.
        - Always include the user_id provided in the context.
        """
        
        # Convert insights to text for the prompt
        insights_text = json.dumps(insights.model_dump(), indent=2)
        
        completion = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User ID: {user_id}\n\nInsights:\n{insights_text}"},
            ],
            response_format=AgentPlan,
        )
        
        return completion.choices[0].message.parsed
