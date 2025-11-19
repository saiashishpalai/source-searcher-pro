from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, agent
from dotenv import load_dotenv

load_dotenv()

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
