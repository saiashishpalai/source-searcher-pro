import os
from typing import Optional
from slack_sdk import WebClient
from notion_client import Client as NotionClient
from todoist_api_python.api import TodoistAPI
from supabase import Client

class IntegrationService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    async def get_token(self, user_id: str, source_type: str) -> Optional[str]:
        """Fetches the access token for a specific user and source."""
        # Note: In a real app, we'd need to handle encryption/decryption of tokens.
        # For this MVP/Monorepo, we assume they are stored as is or we trust the DB.
        
        response = self.supabase.table("user_connections")\
            .select("access_token")\
            .eq("user_id", user_id)\
            .eq("source_type", source_type)\
            .single()\
            .execute()
            
        if response.data:
            return response.data['access_token']
        return None

    async def send_slack_message(self, user_id: str, channel_id: str, text: str):
        token = await self.get_token(user_id, 'slack')
        if not token:
            raise ValueError("Slack not connected")
        
        client = WebClient(token=token)
        client.chat_postMessage(channel=channel_id, text=text)

    async def create_notion_page(self, user_id: str, parent_page_id: str, title: str, content: str):
        token = await self.get_token(user_id, 'notion')
        if not token:
            raise ValueError("Notion not connected")
        
        notion = NotionClient(auth=token)
        # Simplified block creation
        notion.pages.create(
            parent={"page_id": parent_page_id},
            properties={"title": [{"text": {"content": title}}]},
            children=[
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": content}}]
                    }
                }
            ]
        )

    async def create_todoist_task(
        self, 
        user_id: str, 
        content: str, 
        due_string: Optional[str] = None,
        meeting_title: Optional[str] = None,
        assignee_name: Optional[str] = None,
        source_quote: Optional[str] = None,
        priority: int = 2
    ):
        token = await self.get_token(user_id, 'todoist')
        if not token:
            raise ValueError("Todoist not connected")
        
        # Format task name: "[Action Item] {content}" (truncate to ~85 chars to keep total under 100)
        task_name_prefix = "[Action Item] "
        max_content_length = 100 - len(task_name_prefix)
        if len(content) > max_content_length:
            content_truncated = content[:max_content_length - 3] + "..."
        else:
            content_truncated = content
        task_name = f"{task_name_prefix}{content_truncated}"
        
        # Format description
        description_parts = []
        if meeting_title:
            description_parts.append(f"**From Meeting:** {meeting_title}")
        description_parts.append("")  # Empty line
        
        if assignee_name:
            description_parts.append(f"**Assigned to:** {assignee_name}")
        else:
            description_parts.append("**Assigned to:** Unassigned")
        
        if source_quote:
            description_parts.append(f"**Context:** {source_quote}")
        else:
            description_parts.append("**Context:** No additional context")
        
        formatted_description = "\n".join(description_parts)
        
        api = TodoistAPI(token)
        task = api.add_task(
            content=task_name,
            description=formatted_description,
            due_string=due_string,
            priority=priority
        )
        
        # Return task ID and URL for tracking
        return {
            "id": str(task.id),
            "url": f"https://todoist.com/app/task/{task.id}",
            "content": task.content
        }
