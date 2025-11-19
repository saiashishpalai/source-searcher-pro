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
    
    with open("debug_signature.txt", "w") as f:
        try:
            f.write(f"Signature: {inspect.signature(method)}\n")
        except Exception as e:
            f.write(f"Could not get signature: {e}\n")
            
        f.write(f"Docstring: {method.__doc__}\n")

except Exception as e:
    with open("debug_signature.txt", "w") as f:
        f.write(f"Error: {e}\n")
