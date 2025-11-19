import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
client = create_client(url, key)

# List all buckets
try:
    buckets = client.storage.list_buckets()
    print("Available buckets:")
    for bucket in buckets:
        print(f"  - ID: {bucket.id}, Name: {bucket.name}, Public: {bucket.public}")
except Exception as e:
    print(f"Error listing buckets: {e}")
