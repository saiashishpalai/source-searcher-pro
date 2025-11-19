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
        options = {"smart_format": True, "model": "nova-2", "language": "en-US", "paragraphs": True}
        
        print(f"Transcribing {audio_url}...")
        response = deepgram.listen.v1.media.transcribe_url(url=audio_url, **options)
        
        # Convert to dict using model_dump
        data = response.model_dump()
        
        with open("debug_paragraphs.txt", "w") as f:
            if 'results' in data:
                alternative = data['results']['channels'][0]['alternatives'][0]
                if 'paragraphs' in alternative:
                    paragraphs = alternative['paragraphs']
                    f.write(f"Paragraphs keys: {paragraphs.keys()}\n")
                    if 'paragraphs' in paragraphs:
                        p_list = paragraphs['paragraphs']
                        if len(p_list) > 0:
                            p = p_list[0]
                            f.write(f"First paragraph keys: {p.keys()}\n")
                            if 'sentences' in p:
                                s = p['sentences'][0]
                                f.write(f"First sentence keys: {s.keys()}\n")
                                # Check if 'words' is in sentence
                                if 'words' not in s:
                                     f.write("CRITICAL: 'words' not found in sentence\n")
                                else:
                                     f.write(f"First word keys: {s['words'][0].keys()}\n")
                else:
                    f.write("No paragraphs found in alternative\n")
            else:
                f.write("No results found in data\n")

    except Exception as e:
        with open("debug_paragraphs.txt", "w") as f:
            f.write(f"Error: {e}\n")
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(main())
