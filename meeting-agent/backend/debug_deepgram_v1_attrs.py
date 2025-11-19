import os
import sys
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    v1 = deepgram.listen.v1
    
    with open("debug_output_v1_attrs.txt", "w") as f:
        f.write(f"Dir v1: {dir(v1)}\n")
        
        # Check for nested clients
        if hasattr(v1, 'rest'):
             f.write(f"Dir v1.rest: {dir(v1.rest)}\n")
        if hasattr(v1, 'prerecorded'):
             f.write(f"Dir v1.prerecorded: {dir(v1.prerecorded)}\n")

except Exception as e:
    with open("debug_output_v1_attrs.txt", "w") as f:
        f.write(f"Error: {e}\n")
