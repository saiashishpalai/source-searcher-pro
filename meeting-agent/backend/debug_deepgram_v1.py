import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    v1 = deepgram.listen.v("1")
    print(f"Dir v1: {dir(v1)}")
    
    if hasattr(v1, 'transcribe_url'):
        print("Found transcribe_url")
    else:
        print("transcribe_url NOT found")
        
    # Check for 'transcribe_file' or similar
    for attr in dir(v1):
        if 'transcribe' in attr:
            print(f"Found method with 'transcribe': {attr}")

except Exception as e:
    print(f"Error: {e}")
