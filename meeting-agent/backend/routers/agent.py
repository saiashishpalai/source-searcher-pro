from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Query
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

@router.get("/meetings")
async def list_meetings(user_id: str = Query(..., description="User ID")):
    """
    List all meetings for a user with execution counts.
    """
    
    print(f"📋 Listing meetings for user: {user_id}")
    storage = StorageService()
    
    try:
        # Fetch meetings
        meetings_response = storage.supabase.table("meetings").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        meetings = meetings_response.data
        
        # For each meeting, get execution counts
        for meeting in meetings:
            executions_response = storage.supabase.table("action_executions").select("action_type, status").eq("meeting_id", meeting["id"]).execute()
            executions = executions_response.data
            
            # Count tasks created
            tasks_created = len([e for e in executions if e["action_type"] == "create_task" and e["status"] == "success"])
            
            # Count pending approvals (Slack/Notion)
            pending_approvals = len([e for e in executions if e["action_type"] in ["send_slack", "create_page"] and e["status"] == "pending"])
            
            meeting["tasks_created"] = tasks_created
            meeting["pending_approvals"] = pending_approvals
        
        return meetings
    except Exception as e:
        print(f"❌ Error listing meetings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/meetings/{meeting_id}/executions")
async def get_executions(meeting_id: str):
    """
    Get execution log for a specific meeting.
    """
    print(f"📊 Fetching executions for meeting: {meeting_id}")
    storage = StorageService()
    
    try:
        executions_response = storage.supabase.table("action_executions").select("*").eq("meeting_id", meeting_id).order("created_at", desc=False).execute()
        return executions_response.data
    except Exception as e:
        print(f"❌ Error fetching executions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/meetings/{meeting_id}/execute-actions")
async def execute_actions_for_meeting(meeting_id: str, request: PlanRequest):
    """
    Manually trigger action execution for a meeting that has insights but no executions.
    Useful for meetings that were processed before auto-execution was added.
    """
    print(f"🎯 Manual execution trigger for meeting: {meeting_id}, user: {request.user_id}")
    user_id = request.user_id
    storage = StorageService()
    
    try:
        # 1. Fetch Meeting Data
        response = storage.supabase.table("meetings").select("*").eq("id", meeting_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        meeting = response.data
        meeting_title = meeting.get('title', 'Untitled Meeting')
        
        if not meeting.get('insights'):
            raise HTTPException(status_code=400, detail="Meeting has no insights yet")
        
        # 2. Check if executions already exist
        executions_response = storage.supabase.table("action_executions").select("id").eq("meeting_id", meeting_id).execute()
        if executions_response.data:
            print(f"⚠️ Meeting already has {len(executions_response.data)} executions")
            return {"message": "Meeting already has executions", "count": len(executions_response.data)}
        
        # 3. Reconstruct Insights Object
        insights_data = meeting['insights']
        actions_response = storage.supabase.table("action_items").select("*").eq("meeting_id", meeting_id).execute()
        action_items = actions_response.data
        
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
        
        # 4. Generate Plan
        print(f"🤖 Generating action plan...")
        agent = AgentService()
        plan = await agent.plan_actions(user_id, insights_obj, meeting_title=meeting_title)
        print(f"✅ Plan generated with {len(plan.actions)} actions")
        
        # 5. Execute Actions
        dispatcher = ActionDispatcher()
        executed_count = 0
        failed_count = 0
        
        for action in plan.actions:
            if action.type == 'create_task':
                print(f"🔨 Executing task: {action.params.get('content', '')[:50]}...")
                result = await dispatcher.execute_with_retry(action, meeting_id)
                
                from datetime import datetime
                execution_data = {
                    "meeting_id": meeting_id,
                    "user_id": user_id,
                    "action_type": action.type,
                    "action_params": action.params,
                    "status": result["status"],
                    "retry_count": result.get("retry_count", 0),
                    "executed_at": datetime.utcnow().isoformat() if result["status"] == "success" else None
                }
                
                if result.get("task_id"):
                    execution_data["todoist_task_id"] = result["task_id"]
                if result.get("task_url"):
                    execution_data["todoist_task_url"] = result["task_url"]
                if result.get("error"):
                    execution_data["error_message"] = result["error"]
                
                storage.supabase.table("action_executions").insert(execution_data).execute()
                
                if result["status"] == "success":
                    executed_count += 1
                else:
                    failed_count += 1
            else:
                # Store as pending
                storage.supabase.table("action_executions").insert({
                    "meeting_id": meeting_id,
                    "user_id": user_id,
                    "action_type": action.type,
                    "action_params": action.params,
                    "status": "pending"
                }).execute()
        
        return {
            "message": "Actions executed",
            "total_actions": len(plan.actions),
            "tasks_created": executed_count,
            "tasks_failed": failed_count,
            "pending_approvals": len([a for a in plan.actions if a.type != 'create_task'])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error executing actions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error executing actions: {str(e)}")

@router.post("/webhooks/todoist")
async def todoist_webhook(request: Request):
    """
    Webhook endpoint for Todoist status updates.
    This is EVENT-DRIVEN (not polling) - Todoist sends events when tasks change.
    
    Webhook URL to configure in Todoist:
    - Local: http://localhost:8000/api/v1/webhooks/todoist
    - Production: https://your-domain.com/api/v1/webhooks/todoist
    
    Events handled:
    - item:completed - Task completed in Todoist
    - item:uncompleted - Task uncompleted in Todoist
    - item:updated - Task updated (due date, priority, etc.)
    - item:deleted - Task deleted in Todoist
    """
    print(f"🔔 Todoist webhook received")
    storage = StorageService()
    
    try:
        payload = await request.json()
        event_name = payload.get("event_name")
        event_data = payload.get("event_data", {})
        
        print(f"📥 Event: {event_name}, Task ID: {event_data.get('id')}")
        print(f"📊 Event data: {event_data}")
        
        task_id = str(event_data.get("id"))
        
        if event_name == "item:completed":
            # Task completed in Todoist
            print(f"✅ Task {task_id} completed in Todoist - updating database...")
            
            # Update action_items status
            action_items_result = storage.supabase.table("action_items").update({
                "status": "completed"
            }).eq("todoist_task_id", task_id).execute()
            
            # Update action_executions status
            executions_result = storage.supabase.table("action_executions").update({
                "status": "completed",
                "executed_at": "now()"
            }).eq("todoist_task_id", task_id).execute()
            
            print(f"✅ Updated {len(action_items_result.data)} action_items and {len(executions_result.data)} executions to completed")
        
        elif event_name == "item:uncompleted":
            # Task uncompleted in Todoist
            print(f"↩️ Task {task_id} uncompleted in Todoist - updating database...")
            
            storage.supabase.table("action_items").update({
                "status": "in_progress"
            }).eq("todoist_task_id", task_id).execute()
            
            storage.supabase.table("action_executions").update({
                "status": "success"  # Keep as success but mark as in progress
            }).eq("todoist_task_id", task_id).execute()
            
            print(f"✅ Updated task {task_id} to in_progress")
        
        elif event_name == "item:updated":
            # Task updated (due date, priority, etc.)
            print(f"📝 Task {task_id} updated in Todoist")
            # Could sync updated fields if needed (due date, priority, etc.)
            # For now, just log it
        
        elif event_name == "item:deleted":
            # Task deleted in Todoist
            print(f"🗑️ Task {task_id} deleted in Todoist - updating database...")
            
            storage.supabase.table("action_items").update({
                "status": "cancelled"
            }).eq("todoist_task_id", task_id).execute()
            
            storage.supabase.table("action_executions").update({
                "status": "failed",
                "error_message": "Task deleted in Todoist"
            }).eq("todoist_task_id", task_id).execute()
            
            print(f"✅ Updated task {task_id} to cancelled")
        
        return {"status": "ok", "event": event_name, "task_id": task_id}
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
