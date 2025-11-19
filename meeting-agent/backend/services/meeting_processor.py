from services.transcription import TranscriptionService
from services.storage import StorageService
from services.extraction import ExtractionService
import json

async def process_meeting_background(meeting_id: str, audio_url: str):
    """
    Background task to:
    1. Transcribe audio
    2. Save transcript to DB
    3. Update meeting status
    """
    print(f"Processing meeting {meeting_id}...")
    
    try:
        # 1. Transcribe
        transcription_service = TranscriptionService()
        result = await transcription_service.transcribe_url(audio_url)
        
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
        
        storage.supabase.table("meetings").update({
            "status": "done",
            "insights": insights_json
        }).eq("id", meeting_id).execute()
        
        print(f"Meeting {meeting_id} processed successfully.")
        
    except Exception as e:
        print(f"Error processing meeting {meeting_id}: {e}")
        # Update status to failed
        storage = StorageService()
        storage.supabase.table("meetings").update({
            "status": "failed"
        }).eq("id", meeting_id).execute()
