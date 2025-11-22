from services.transcription import TranscriptionService
from services.storage import StorageService
from services.extraction import ExtractionService
from services.agent import AgentService
from services.action_dispatcher import ActionDispatcher, AgentAction
import json

async def process_meeting_background(meeting_id: str, audio_url: str):
    """
    Background task to:
    1. Transcribe audio
    2. Save transcript to DB
    3. Update meeting status
    """
    import traceback
    print(f"[MEETING PROCESSOR] Starting processing for meeting {meeting_id}")
    print(f"[MEETING PROCESSOR] Audio URL: {audio_url}")
    
    try:
        # 1. Transcribe
        print(f"[MEETING PROCESSOR] Starting transcription for meeting {meeting_id}...")
        transcription_service = TranscriptionService()
        result = await transcription_service.transcribe_url(audio_url)
        print(f"[MEETING PROCESSOR] Transcription completed for meeting {meeting_id}")
        
        # Extract text and segments
        # Deepgram structure: results.channels[0].alternatives[0]
        alternative = result['results']['channels'][0]['alternatives'][0]
        full_text = alternative['transcript']
        words = alternative.get('words', [])
        
        # 2. Save to DB
        storage = StorageService()
        
        # Update meeting status
        storage.supabase.table("meetings").update({
            "status": "transcribed"
        }).eq("id", meeting_id).execute()
        
        # Save Transcript
        # We'll save the raw JSON for now, and maybe a simplified version
        transcript_data = {
            "meeting_id": meeting_id,
            "text": full_text,
            "speaker_label": "raw_deepgram", # We will parse diarization later
            "start_time": 0,
            "end_time": result['metadata']['duration']
        }
        
        # Note: The schema has 'text', 'speaker_label', etc.
        # For the MVP, let's just save the full text in one row for now, 
        # or we need to parse the diarization (paragraphs).
        
        if 'paragraphs' in alternative:
            paragraphs = alternative['paragraphs']['paragraphs']
            transcript_rows = []
            for p in paragraphs:
                transcript_rows.append({
                    "meeting_id": meeting_id,
                    "speaker_label": f"Speaker {p['speaker']}",
                    "text": " ".join([s['text'] for s in p['sentences']]),
                    "start_time": p['start'],
                    "end_time": p['end']
                })
            
            if transcript_rows:
                storage.supabase.table("transcripts").insert(transcript_rows).execute()
            # Fallback if no paragraphs
            storage.supabase.table("transcripts").insert(transcript_data).execute()
            
        # 3. Extract Insights
        print(f"Extracting insights for meeting {meeting_id}...")
        extraction_service = ExtractionService()
        insights = await extraction_service.extract_insights(full_text)
        
        # Save Insights to DB
        # Action Items
        if insights.action_items:
            actions_data = [
                {
                    "meeting_id": meeting_id,
                    "description": item.description,
                    "assignee_id": None, # We don't have user mapping yet
                    "status": "open",
                    "source_quote": f"Assignee: {item.assignee}, Due: {item.due_date}" # Store extra metadata here for now
                }
                for item in insights.action_items
            ]
            storage.supabase.table("action_items").insert(actions_data).execute()
            
        # Save other insights to JSONB column in meetings table
        insights_json = {
            "summary": insights.summary,
            "decisions": [d.model_dump() for d in insights.decisions],
            "blockers": [b.model_dump() for b in insights.blockers],
            "risks": [r.model_dump() for r in insights.risks]
        }
        
        # Get meeting data to extract user_id and title
        # Try to get user_id, but handle if column doesn't exist yet
        try:
            meeting_response = storage.supabase.table("meetings").select("user_id, title").eq("id", meeting_id).single().execute()
        except Exception as e:
            # If user_id column doesn't exist, try without it
            print(f"[MEETING PROCESSOR] ⚠️ user_id column not found, trying without it: {e}")
            meeting_response = storage.supabase.table("meetings").select("title").eq("id", meeting_id).single().execute()
        
        if not meeting_response.data:
            raise ValueError(f"Meeting {meeting_id} not found")
        
        user_id = meeting_response.data.get("user_id")
        meeting_title = meeting_response.data.get("title", "Untitled Meeting")
        
        # If user_id is missing, we can't execute actions - skip auto-execution
        if not user_id:
            print(f"[MEETING PROCESSOR] ⚠️ No user_id found for meeting {meeting_id}. Skipping auto-execution.")
            print(f"[MEETING PROCESSOR] 💡 To enable auto-execution, add user_id column to meetings table and include it in upload.")
        
        storage.supabase.table("meetings").update({
            "status": "done",
            "insights": insights_json
        }).eq("id", meeting_id).execute()
        
        # NEW: Auto-generate action plan (only if user_id exists)
        if not user_id:
            print(f"[MEETING PROCESSOR] ⚠️ Skipping auto-execution - no user_id")
            storage.supabase.table("meetings").update({
                "status": "done",
                "insights": insights_json
            }).eq("id", meeting_id).execute()
            print(f"Meeting {meeting_id} processed successfully (without auto-execution).")
            return
        
        print(f"[MEETING PROCESSOR] ⚡ Auto-generating action plan for meeting {meeting_id}")
        print(f"[MEETING PROCESSOR] 📊 User ID: {user_id}, Title: {meeting_title}")
        print(f"[MEETING PROCESSOR] 📋 Action items count: {len(insights.action_items)}")
        try:
            agent = AgentService()
            print(f"[MEETING PROCESSOR] 🤖 Calling AgentService.plan_actions...")
            plan = await agent.plan_actions(user_id, insights, meeting_title=meeting_title)
            print(f"[MEETING PROCESSOR] ✅ Plan generated with {len(plan.actions)} actions")
            
            # NEW: Auto-execute create_task actions
            dispatcher = ActionDispatcher()
            task_actions = [a for a in plan.actions if a.type == 'create_task']
            print(f"[MEETING PROCESSOR] 🎯 Found {len(task_actions)} create_task actions to execute")
            
            for idx, action in enumerate(plan.actions, 1):
                if action.type == 'create_task':
                    print(f"[MEETING PROCESSOR] 🔨 [{idx}/{len(plan.actions)}] Auto-executing task creation: {action.params.get('content', '')[:50]}...")
                    print(f"[MEETING PROCESSOR] 📝 Action params: {action.params}")
                    # Execute with retry
                    result = await dispatcher.execute_with_retry(action, meeting_id)
                    print(f"[MEETING PROCESSOR] 📊 Execution result: {result}")
                    
                    # Store execution record
                    from datetime import datetime
                    execution_data = {
                        "meeting_id": meeting_id,
                        "user_id": user_id,
                        "action_type": action.type,
                        "action_params": action.params,  # Already a dict, JSONB will handle it
                        "status": result["status"],
                        "retry_count": result.get("retry_count", 0),
                        "executed_at": datetime.utcnow().isoformat() if result["status"] == "success" else None
                    }
                    
                    if result.get("task_id"):
                        execution_data["todoist_task_id"] = result["task_id"]
                        print(f"[MEETING PROCESSOR] ✅ Task created with ID: {result['task_id']}")
                    if result.get("task_url"):
                        execution_data["todoist_task_url"] = result["task_url"]
                        print(f"[MEETING PROCESSOR] 🔗 Task URL: {result['task_url']}")
                    if result.get("error"):
                        execution_data["error_message"] = result["error"]
                        print(f"[MEETING PROCESSOR] ❌ Error: {result['error']}")
                    
                    print(f"[MEETING PROCESSOR] 💾 Storing execution record...")
                    insert_result = storage.supabase.table("action_executions").insert(execution_data).execute()
                    print(f"[MEETING PROCESSOR] ✅ Execution record stored: {insert_result.data if hasattr(insert_result, 'data') else 'OK'}")
                    
                    # Update corresponding action_item if we can match it
                    if result.get("task_id") and result.get("task_url"):
                        # Try to find matching action item by description
                        action_items_response = storage.supabase.table("action_items").select("id").eq("meeting_id", meeting_id).eq("description", action.params.get('content')).limit(1).execute()
                        if action_items_response.data:
                            action_item_id = action_items_response.data[0]["id"]
                            storage.supabase.table("action_items").update({
                                "todoist_task_id": result["task_id"],
                                "todoist_task_url": result["task_url"],
                                "status": "in_progress"
                            }).eq("id", action_item_id).execute()
                    
                    print(f"[MEETING PROCESSOR] Task execution result: {result['status']}")
                else:
                    # Store as pending for human approval (Slack/Notion)
                    print(f"[MEETING PROCESSOR] ⏳ [{idx}/{len(plan.actions)}] Storing {action.type} action as pending for approval")
                    pending_result = storage.supabase.table("action_executions").insert({
                        "meeting_id": meeting_id,
                        "user_id": user_id,
                        "action_type": action.type,
                        "action_params": action.params,  # Already a dict, JSONB will handle it
                        "status": "pending"
                    }).execute()
                    print(f"[MEETING PROCESSOR] ✅ Pending action stored: {pending_result.data if hasattr(pending_result, 'data') else 'OK'}")
            
            print(f"[MEETING PROCESSOR] Action plan executed: {len([a for a in plan.actions if a.type == 'create_task'])} tasks created, {len([a for a in plan.actions if a.type != 'create_task'])} pending approval")
        except Exception as plan_error:
            print(f"[MEETING PROCESSOR] Error in auto-execution: {plan_error}")
            import traceback
            traceback.print_exc()
            # Don't fail the whole meeting processing if plan generation fails
        
        print(f"Meeting {meeting_id} processed successfully.")
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[MEETING PROCESSOR] ERROR processing meeting {meeting_id}: {e}")
        print(f"[MEETING PROCESSOR] Traceback:\n{error_trace}")
        # Update status to failed
        try:
            storage = StorageService()
            storage.supabase.table("meetings").update({
                "status": "failed"
            }).eq("id", meeting_id).execute()
        except Exception as db_error:
            print(f"[MEETING PROCESSOR] Failed to update status in DB: {db_error}")
