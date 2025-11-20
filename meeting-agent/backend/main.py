from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from multiple locations
# 1. Current directory .env
load_dotenv()
# 2. Parent directory .env.local (for shared config)
parent_env = Path(__file__).parent.parent.parent / '.env.local'
if parent_env.exists():
    load_dotenv(parent_env)
# 3. Also check for SUPABASE_URL vs VITE_SUPABASE_URL
if not os.environ.get('SUPABASE_URL') and os.environ.get('VITE_SUPABASE_URL'):
    os.environ['SUPABASE_URL'] = os.environ['VITE_SUPABASE_URL']
if not os.environ.get('SUPABASE_KEY') and os.environ.get('VITE_SUPABASE_ANON_KEY'):
    os.environ['SUPABASE_KEY'] = os.environ['VITE_SUPABASE_ANON_KEY']

from routers import upload, agent

app = FastAPI(title="Meeting Agent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Meeting Agent API is running"}
