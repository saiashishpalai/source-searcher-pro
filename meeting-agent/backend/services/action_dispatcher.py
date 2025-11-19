from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.integrations import IntegrationService
from services.storage import StorageService

class AgentAction(BaseModel):
    type: str # 'create_task', 'send_slack', 'create_page'
    params: Dict[str, Any]
    user_id: str

class ActionDispatcher:
    def __init__(self):
        self.storage = StorageService()
        self.integrations = IntegrationService(self.storage.supabase)

    async def dispatch(self, action: AgentAction):
        """Routes the action to the correct integration."""
        print(f"Dispatching action: {action.type} for user {action.user_id}")
        
        try:
            if action.type == 'create_task':
                await self.integrations.create_todoist_task(
                    user_id=action.user_id,
                    content=action.params.get('content'),
                    due_string=action.params.get('due_string')
                )
            elif action.type == 'send_slack':
                await self.integrations.send_slack_message(
                    user_id=action.user_id,
                    channel_id=action.params.get('channel_id'),
                    text=action.params.get('text')
                )
            elif action.type == 'create_page':
                await self.integrations.create_notion_page(
                    user_id=action.user_id,
                    parent_page_id=action.params.get('parent_page_id'),
                    title=action.params.get('title'),
                    content=action.params.get('content')
                )
            else:
                raise ValueError(f"Unknown action type: {action.type}")
                
            return {"status": "success", "action": action.type}
            
        except Exception as e:
            print(f"Action failed: {e}")
            return {"status": "error", "error": str(e)}
