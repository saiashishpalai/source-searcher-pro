import os
import sys
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    v1 = deepgram.listen.v("1")
    
    with open("debug_output_v1.txt", "w") as f:
        f.write(f"Dir v1: {dir(v1)}\n")
        if hasattr(v1, 'transcribe_url'):
            f.write("Found transcribe_url\n")
        else:
            f.write("transcribe_url NOT found\n")
            
        for attr in dir(v1):
            if 'transcribe' in attr:
                f.write(f"Found method with 'transcribe': {attr}\n")

except Exception as e:
    with open("debug_output_v1.txt", "w") as f:
        f.write(f"Error: {e}\n")
