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
    print(f"🎯 Plan generation request for meeting: {meeting_id}, user: {request.user_id}")
    user_id = request.user_id
    storage = StorageService()
    
    try:
        # 1. Fetch Meeting Data
        print(f"📥 Fetching meeting data...")
        response = storage.supabase.table("meetings").select("*").eq("id", meeting_id).single().execute()
        if not response.data:
            print(f"❌ Meeting not found: {meeting_id}")
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting = response.data
        print(f"✅ Meeting found: {meeting.get('title', 'Untitled')}")
        
        if not meeting.get('insights'):
            print(f"❌ Meeting has no insights yet")
            raise HTTPException(status_code=400, detail="Meeting has no insights yet")
        
        # 2. Reconstruct Insights Object
        # Note: We stored insights as JSONB, we need to parse it back to Pydantic to be safe, 
        # or just pass the dict if AgentService accepts it. 
        # AgentService expects MeetingInsights object.
        print(f"📊 Reconstructing insights object...")
        insights_data = meeting['insights']
        # We need to map the JSONB back to the model structure if it matches exactly
        # Our JSONB structure in meeting_processor.py was:
        # { "summary": ..., "decisions": [...], "blockers": [...], "risks": [...] }
        # But MeetingInsights also has 'action_items'.
        # We stored action_items in a separate table!
        
        # Fetch Action Items
        print(f"📋 Fetching action items...")
        actions_response = storage.supabase.table("action_items").select("*").eq("meeting_id", meeting_id).execute()
        action_items = actions_response.data
        print(f"✅ Found {len(action_items)} action items")
        
        # Reconstruct full object with action items including metadata
        insights_obj = MeetingInsights(
            summary=insights_data.get('summary', ''),
            decisions=insights_data.get('decisions', []),
            blockers=insights_data.get('blockers', []),
            risks=insights_data.get('risks', []),
            action_items=[
                {
                    "description": a['description'], 
                    "assignee": a.get('source_quote', '').split('Assignee: ')[1].split(',')[0] if 'Assignee:' in a.get('source_quote', '') else None,
                    "due_date": a.get('source_quote', '').split('Due: ')[1] if 'Due:' in a.get('source_quote', '') else None
                } 
                for a in action_items
            ]
        )
        
        # Store meeting title for agent service
        meeting_title = meeting.get('title', 'Untitled Meeting')
        
        # 3. Generate Plan
        print(f"🤖 Calling agent service to generate plan...")
        agent = AgentService()
        plan = await agent.plan_actions(user_id, insights_obj, meeting_title=meeting_title)
        
        print(f"✅ Plan generated successfully with {len(plan.actions)} actions")
        return plan
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in plan generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")

@router.post("/actions/execute")
async def execute_action(action: dict):
    """
    Executes a single action. 
    In the UI, the user will see the plan, approve actions, and call this endpoint for each.
    """
    print(f"🎯 Executing action: {action.get('type', 'unknown')}")
    dispatcher = ActionDispatcher()
    # We need to convert dict back to AgentAction model
    # But AgentAction is in services.action_dispatcher
    from services.action_dispatcher import AgentAction
    
    try:
        agent_action = AgentAction(**action)
        result = await dispatcher.dispatch(agent_action)
        print(f"✅ Action executed successfully")
        return result
    except Exception as e:
        print(f"❌ Error executing action: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
