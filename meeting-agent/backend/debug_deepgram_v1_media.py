import os
import sys
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    v1 = deepgram.listen.v1
    
    with open("debug_output_v1_media.txt", "w") as f:
        if hasattr(v1, 'media'):
             f.write(f"Dir v1.media: {dir(v1.media)}\n")
             if hasattr(v1.media, 'transcribe_url'):
                 f.write("Found transcribe_url in v1.media\n")
        else:
             f.write("v1 has no media attribute\n")

except Exception as e:
    with open("debug_output_v1_media.txt", "w") as f:
        f.write(f"Error: {e}\n")
