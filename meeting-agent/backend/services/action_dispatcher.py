from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from services.integrations import IntegrationService
from services.storage import StorageService
import asyncio

class AgentAction(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    type: str = Field(description="Type of action: 'create_task', 'send_slack', 'create_page'")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the action")
    user_id: str = Field(description="User ID")

class ActionDispatcher:
    def __init__(self):
        self.storage = StorageService()
        self.integrations = IntegrationService(self.storage.supabase)

    async def dispatch(self, action: AgentAction):
        """Routes the action to the correct integration."""
        print(f"Dispatching action: {action.type} for user {action.user_id}")
        
        try:
            if action.type == 'create_task':
                result = await self.integrations.create_todoist_task(
                    user_id=action.user_id,
                    content=action.params.get('content'),
                    due_string=action.params.get('due_string'),
                    meeting_title=action.params.get('meeting_title'),
                    assignee_name=action.params.get('assignee_name'),
                    source_quote=action.params.get('source_quote'),
                    priority=action.params.get('priority', 2)
                )
                return {
                    "status": "success",
                    "action": action.type,
                    "task_id": result.get("id"),
                    "task_url": result.get("url")
                }
            elif action.type == 'send_slack':
                await self.integrations.send_slack_message(
                    user_id=action.user_id,
                    channel_id=action.params.get('channel_id'),
                    text=action.params.get('text')
                )
                return {"status": "success", "action": action.type}
            elif action.type == 'create_page':
                await self.integrations.create_notion_page(
                    user_id=action.user_id,
                    parent_page_id=action.params.get('parent_page_id'),
                    title=action.params.get('title'),
                    content=action.params.get('content')
                )
                return {"status": "success", "action": action.type}
            else:
                raise ValueError(f"Unknown action type: {action.type}")
            
        except Exception as e:
            print(f"Action failed: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "error": str(e)}

    async def execute_with_retry(self, action: AgentAction, meeting_id: str, max_retries: int = 3):
        """Execute action with retry logic and exponential backoff."""
        for attempt in range(max_retries):
            try:
                print(f"Executing action {action.type} (attempt {attempt + 1}/{max_retries})")
                result = await self.dispatch(action)
                
                if result["status"] == "success":
                    return {
                        "status": "success",
                        "task_id": result.get("task_id"),
                        "task_url": result.get("task_url"),
                        "retry_count": attempt
                    }
                else:
                    # If dispatch returns error, treat as failure
                    raise Exception(result.get("error", "Unknown error"))
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    # Final attempt failed
                    print(f"Action failed after {max_retries} attempts: {e}")
                    return {
                        "status": "failed",
                        "error": str(e),
                        "retry_count": attempt + 1
                    }
                else:
                    # Wait before retry with exponential backoff
                    wait_time = 2 ** attempt
                    print(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
        
        return {"status": "failed", "error": "Max retries exceeded", "retry_count": max_retries}
