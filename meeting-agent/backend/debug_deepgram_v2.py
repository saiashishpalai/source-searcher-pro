import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    # Try accessing v("1")
    v1 = deepgram.listen.v("1")
    print(f"Dir deepgram.listen.v('1'): {dir(v1)}")
    
    # Check for transcribe_url
    if hasattr(v1, 'transcribe_url'):
        print("Found transcribe_url in v('1')")
    elif hasattr(v1, 'rest'):
         print(f"Found rest in v('1'): {dir(v1.rest)}")
    
            
except Exception as e:
    print(f"Error: {e}")
