import os
# must be before anything else
from dotenv import load_dotenv
load_dotenv()


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_audio

app = FastAPI(title="Debate Analyzer (Whisper + Pyannote)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_audio.router)

@app.get("/")
async def root():
    return {"message": "Whisper + Pyannote backend running!"}