import os
from supabase import create_client, Client
from fastapi import UploadFile

class StorageService:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        self.supabase: Client = create_client(url, key)
        self.bucket_name = "meeting-audio"
        
        # Ensure bucket exists
        try:
            buckets = self.supabase.storage.list_buckets()
            bucket_exists = any(b.id == self.bucket_name for b in buckets)
            if not bucket_exists:
                print(f"[DEBUG] Bucket '{self.bucket_name}' not found, creating it...")
                self.supabase.storage.create_bucket(self.bucket_name, options={"public": True})
                print(f"[DEBUG] Bucket created successfully")
            else:
                print(f"[DEBUG] Bucket '{self.bucket_name}' already exists")
        except Exception as e:
            print(f"[DEBUG] Error checking/creating bucket: {e}")

    async def upload_file(self, file: UploadFile, file_path: str) -> str:
        """Uploads a file to Supabase Storage and returns the public URL."""
        print(f"[DEBUG] Starting upload for file: {file.filename}")
        print(f"[DEBUG] File path: {file_path}")
        print(f"[DEBUG] Bucket name: {self.bucket_name}")
        print(f"[DEBUG] Supabase URL: {os.environ.get('SUPABASE_URL')}")
        
        file_content = await file.read()
        print(f"[DEBUG] File size: {len(file_content)} bytes")
        
        try:
            # Upload to Supabase
            print(f"[DEBUG] Attempting upload to bucket '{self.bucket_name}'...")
            result = self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": file.content_type}
            )
            print(f"[DEBUG] Upload result: {result}")
            
            # Get Public URL
            res = self.supabase.storage.from_(self.bucket_name).get_public_url(file_path)
            print(f"[DEBUG] Public URL: {res}")
            return res
        except Exception as e:
            print(f"[DEBUG] Upload failed with error: {e}")
            print(f"[DEBUG] Error type: {type(e)}")
            raise
