import os
from deepgram import DeepgramClient

class TranscriptionService:
    def __init__(self):
        api_key = os.environ.get("DEEPGRAM_API_KEY")
        self.deepgram = DeepgramClient(api_key=api_key)

    async def transcribe_url(self, audio_url: str):
        """Transcribes audio from a URL using Deepgram Nova-2."""
        options = {
            "model": "nova-2",
            "smart_format": True,
            "diarize": True,
            "punctuate": True,
            "paragraphs": True
        }
        
        response = self.deepgram.listen.v1.media.transcribe_url(url=audio_url, **options)
        return response.model_dump()
