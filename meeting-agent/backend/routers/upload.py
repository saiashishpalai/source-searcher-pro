from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from services.storage import StorageService
from services.meeting_processor import process_meeting_background
import uuid
import os

router = APIRouter()

@router.post("/upload")
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(('.mp3', '.wav', '.m4a', '.mp4')):
        raise HTTPException(status_code=400, detail="Invalid file format")
    
    try:
        storage = StorageService()
        # Generate unique path: {uuid}/{filename}
        file_id = str(uuid.uuid4())
        file_path = f"{file_id}/{file.filename}"
        
        public_url = await storage.upload_file(file, file_path)
        
        # Save to DB
        meeting_data = {
            "title": file.filename,
            "audio_url": public_url,
            "status": "processing"
        }
        
        # We need to access supabase client from storage service or create new one
        # For MVP, let's reuse storage.supabase
        data = storage.supabase.table("meetings").insert(meeting_data).execute()
        meeting_id = data.data[0]['id']
        
        # Trigger Background Transcription
        background_tasks.add_task(process_meeting_background, meeting_id, public_url)
        
        return {
            "id": meeting_id,
            "url": public_url,
            "filename": file.filename,
            "status": "processing"
        }
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/meetings/{meeting_id}/retry")
async def retry_processing(meeting_id: str, background_tasks: BackgroundTasks):
    try:
        storage = StorageService()
        
        # Fetch meeting to get audio_url
        response = storage.supabase.table("meetings").select("*").eq("id", meeting_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        meeting = response.data[0]
        audio_url = meeting['audio_url']
        
        # Update status to processing
        storage.supabase.table("meetings").update({
            "status": "processing",
            "insights": None # Clear previous insights if any
        }).eq("id", meeting_id).execute()
        
        # Trigger Background Task
        background_tasks.add_task(process_meeting_background, meeting_id, audio_url)
        
        return {"status": "processing", "message": "Retry initiated"}
        
    except Exception as e:
        print(f"Retry error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
