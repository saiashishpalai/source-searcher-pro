import os
import asyncio
import json
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
        
        with open("debug_response.txt", "w") as f:
            f.write(f"Transcribing {audio_url}...\n")
            
            try:
                response = deepgram.listen.v1.media.transcribe_url(url=audio_url, **options)
                f.write(f"Response Type: {type(response)}\n")
                f.write(f"Dir Response: {dir(response)}\n")
                
                if hasattr(response, 'to_json'):
                    f.write("Found to_json()\n")
                    # f.write(f"JSON: {response.to_json()}\n")
                
                if hasattr(response, 'to_dict'):
                    f.write("Found to_dict()\n")
                else:
                    f.write("to_dict() NOT found\n")

            except Exception as inner_e:
                f.write(f"Inner Error: {inner_e}\n")
            
    except Exception as e:
        with open("debug_response.txt", "w") as f:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())
