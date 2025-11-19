from fastapi import APIRouter, HTTPException, BackgroundTasks
from services.storage import StorageService
from services.agent import AgentService
from services.action_dispatcher import ActionDispatcher
from models.extraction import MeetingInsights
import json

router = APIRouter()

from pydantic import BaseModel

class PlanRequest(BaseModel):
    user_id: str

@router.post("/meetings/{meeting_id}/plan")
async def generate_plan(meeting_id: str, request: PlanRequest):
    user_id = request.user_id
    storage = StorageService()
    
    # 1. Fetch Meeting Data
    response = storage.supabase.table("meetings").select("*").eq("id", meeting_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = response.data
    if not meeting.get('insights'):
        raise HTTPException(status_code=400, detail="Meeting has no insights yet")
        
    # 2. Reconstruct Insights Object
    # Note: We stored insights as JSONB, we need to parse it back to Pydantic to be safe, 
    # or just pass the dict if AgentService accepts it. 
    # AgentService expects MeetingInsights object.
    try:
        insights_data = meeting['insights']
        # We need to map the JSONB back to the model structure if it matches exactly
        # Our JSONB structure in meeting_processor.py was:
        # { "summary": ..., "decisions": [...], "blockers": [...], "risks": [...] }
        # But MeetingInsights also has 'action_items'.
        # We stored action_items in a separate table!
        
        # Fetch Action Items
        actions_response = storage.supabase.table("action_items").select("*").eq("meeting_id", meeting_id).execute()
        action_items = actions_response.data
        
        # Reconstruct full object
        insights_obj = MeetingInsights(
            summary=insights_data.get('summary', ''),
            decisions=insights_data.get('decisions', []),
            blockers=insights_data.get('blockers', []),
            risks=insights_data.get('risks', []),
            action_items=[
                {"description": a['description'], "assignee": None, "due_date": None} 
                for a in action_items
            ]
        )
        
    except Exception as e:
        print(f"Error reconstructing insights: {e}")
        raise HTTPException(status_code=500, detail="Error processing meeting data")

    # 3. Generate Plan
    agent = AgentService()
    plan = await agent.plan_actions(user_id, insights_obj)
    
    return plan

@router.post("/actions/execute")
async def execute_action(action: dict):
    """
    Executes a single action. 
    In the UI, the user will see the plan, approve actions, and call this endpoint for each.
    """
    dispatcher = ActionDispatcher()
    # We need to convert dict back to AgentAction model
    # But AgentAction is in services.action_dispatcher
    from services.action_dispatcher import AgentAction
    
    try:
        agent_action = AgentAction(**action)
        result = await dispatcher.dispatch(agent_action)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
