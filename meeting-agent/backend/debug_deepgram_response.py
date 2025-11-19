import os
import asyncio
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        api_key = os.environ.get("DEEPGRAM_API_KEY")
        deepgram = DeepgramClient(api_key=api_key)
        
        # Use a sample audio URL
        audio_url = "https://dpgr.am/spacewalk.wav"
        options = {"smart_format": True, "model": "nova-2", "language": "en-US"}
        
        print(f"Transcribing {audio_url}...")
        response = deepgram.listen.v1.media.transcribe_url(url=audio_url, **options)
        
        print(f"Response Type: {type(response)}")
        print(f"Dir Response: {dir(response)}")
        
        if hasattr(response, 'to_json'):
            print("Found to_json()")
        
        # Check if it behaves like a dict or pydantic model
        try:
            print(f"Response as dict: {response.dict()}")
        except:
            print("Not a Pydantic model with .dict()")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
