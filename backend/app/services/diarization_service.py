import os
import traceback
from dotenv import load_dotenv
from pyannote.audio import Pipeline

# =============================
# Safe Windows configuration
# =============================
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
os.environ["SPEECHBRAIN_LOCAL_CACHE"] = "1"

# =============================
# Hugging Face Token & Model
# =============================
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_CACHE = "D:/debate-fact-checker/model_cache"
os.makedirs(MODEL_CACHE, exist_ok=True)

print("🔧 Initializing Pyannote diarization pipeline...")

try:
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization",
        use_auth_token=HF_TOKEN,
        cache_dir=MODEL_CACHE
    )
    print("✅ Pyannote diarization pipeline loaded successfully!")
except Exception as e:
    print("❌ Failed to load Pyannote pipeline:", e)
    pipeline = None


def diarize_audio(file_path: str):
    """
    Run diarization on a WAV file and log all details.
    """
    if not pipeline:
        raise RuntimeError("❌ Pyannote pipeline not initialized.")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"❌ Audio file not found: {file_path}")

    print(f"🎧 Running diarization on: {file_path}")

    try:
        # Run diarization
        result = pipeline(file_path)
        print("✅ Diarization completed successfully.")
        print(f"🗂️ Result type: {type(result)}")

        # Inspect first few segments
        try:
            count = 0
            for turn, _, speaker in result.itertracks(yield_label=True):
                print(f"[{turn.start:.2f}s - {turn.end:.2f}s] Speaker: {speaker}")
                count += 1
                if count >= 5:
                    break
        except Exception as iter_err:
            print(f"⚠️ Failed to iterate diarization output: {iter_err}")

        return result

    except Exception as e:
        print("❌ Diarization failed:")
        print(traceback.format_exc())
        raise RuntimeError(f"Pyannote diarization failed: {e}")
