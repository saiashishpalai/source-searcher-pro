import os
import inspect
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

try:
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    deepgram = DeepgramClient(api_key=api_key)
    
    v1 = deepgram.listen.v1
    method = v1.media.transcribe_url
    
    print(f"Signature: {inspect.signature(method)}")
    print(f"Docstring: {method.__doc__}")

except Exception as e:
    print(f"Error: {e}")
