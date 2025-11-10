import os
from dotenv import load_dotenv
from pyannote.audio import Pipeline

# =============================
# Safe Windows configuration
# =============================
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
os.environ["SPEECHBRAIN_LOCAL_CACHE"] = "1"

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

try:
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization",
        use_auth_token=HF_TOKEN,
        cache_dir="D:/debate-fact-checker/model_cache"
    )
    print("✅ Pyannote diarization pipeline loaded successfully!")
except Exception as e:
    print("❌ Failed to load Pyannote pipeline:", e)
    pipeline = None


# Example function
def diarize_audio(file_path: str):
    if not pipeline:
        raise RuntimeError("Pyannote pipeline not initialized.")
    diarization = pipeline(file_path)
    return diarization