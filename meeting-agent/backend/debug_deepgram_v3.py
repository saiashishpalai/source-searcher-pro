import os
import sys
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    v1 = deepgram.listen.v("1")
    
    with open("debug_output.txt", "w") as f:
        f.write(f"Dir v1: {dir(v1)}\n")
        if hasattr(v1, 'transcribe_url'):
            f.write("Found transcribe_url in v1\n")
        
        # Check for other common attributes
        if hasattr(v1, 'rest'):
             f.write(f"Found rest in v1: {dir(v1.rest)}\n")
             
except Exception as e:
    with open("debug_output.txt", "w") as f:
        f.write(f"Error: {e}\n")
