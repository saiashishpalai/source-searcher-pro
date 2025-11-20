import os
from deepgram import DeepgramClient

class TranscriptionService:
    def __init__(self):
        api_key = os.environ.get("DEEPGRAM_API_KEY")
        self.deepgram = DeepgramClient(api_key=api_key)

    async def transcribe_url(self, audio_url: str):
        """Transcribes audio from a URL using Deepgram Nova-2."""
        print(f"[TRANSCRIPTION] Starting transcription for URL: {audio_url}")
        print(f"[TRANSCRIPTION] Deepgram API key present: {bool(os.environ.get('DEEPGRAM_API_KEY'))}")
        
        options = {
            "model": "nova-2",
            "smart_format": True,
            "diarize": True,
            "punctuate": True,
            "paragraphs": True
        }
        
        try:
            print(f"[TRANSCRIPTION] Calling Deepgram API...")
            response = self.deepgram.listen.v1.media.transcribe_url(url=audio_url, **options)
            print(f"[TRANSCRIPTION] Deepgram API call successful")
            result = response.model_dump()
            print(f"[TRANSCRIPTION] Transcription result keys: {list(result.keys())}")
            return result
        except Exception as e:
            print(f"[TRANSCRIPTION] ERROR calling Deepgram API: {e}")
            import traceback
            print(f"[TRANSCRIPTION] Traceback:\n{traceback.format_exc()}")
            raise
