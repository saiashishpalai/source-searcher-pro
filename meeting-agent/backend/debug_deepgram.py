import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    print(f"Deepgram Client: {deepgram}")
    print(f"Dir deepgram: {dir(deepgram)}")
    
    if hasattr(deepgram, 'listen'):
        print(f"Dir deepgram.listen: {dir(deepgram.listen)}")
        if hasattr(deepgram.listen, 'rest'):
            print(f"Dir deepgram.listen.rest: {dir(deepgram.listen.rest)}")
        if hasattr(deepgram.listen, 'prerecorded'):
            print(f"Dir deepgram.listen.prerecorded: {dir(deepgram.listen.prerecorded)}")
            
except Exception as e:
    print(f"Error: {e}")
