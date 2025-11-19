import os
import asyncio
from dotenv import load_dotenv
from services.transcription import TranscriptionService

load_dotenv()

async def main():
    try:
        print("Initializing TranscriptionService...")
        service = TranscriptionService()
        
        # Use a sample audio URL from Deepgram docs or a public one
        audio_url = "https://dpgr.am/spacewalk.wav"
        
        print(f"Transcribing {audio_url}...")
        result = await service.transcribe_url(audio_url)
        
        print("Transcription successful!")
        print(f"Duration: {result['metadata']['duration']}")
        print(f"Transcript snippet: {result['results']['channels'][0]['alternatives'][0]['transcript'][:50]}...")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
