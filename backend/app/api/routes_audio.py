import os
import ffmpeg
import tempfile
import shutil
import asyncio
import time
from fastapi import APIRouter, WebSocket
from app.services.whisper_service import transcribe_audio

router = APIRouter()

# ==========================================
# CONFIGURATION
# ==========================================
AUDIO_DEBUG_DIR = os.path.join(os.getcwd(), "audio_debug")
os.makedirs(AUDIO_DEBUG_DIR, exist_ok=True)
LIVE_WEBM_PATH = os.path.join(AUDIO_DEBUG_DIR, "live_audio_stream.webm")

CHUNK_SIZE_THRESHOLD = 120_000   # process ~1.5–2s of audio
MAX_FILE_SIZE = 8_000_000        # reset file every 8MB
OVERLAP_SIZE = 80_000            # keep last ~1s overlap
SILENCE_THRESHOLD = 200          # RMS level for silence skip
SILENCE_TIMEOUT = 10             # reset context after inactivity


# ==========================================
# HELPERS
# ==========================================
def has_voice(wav_path: str) -> bool:
    """Quick silence detection using RMS."""
    import audioop
    try:
        with open(wav_path, "rb") as f:
            raw = f.read()
            rms = audioop.rms(raw, 2)
            print(f"🎚️ RMS level: {rms}")
            return rms > SILENCE_THRESHOLD
    except Exception as e:
        print(f"⚠️ Voice detection failed: {e}")
        return True


def convert_webm_to_wav_safe(input_path: str, sample_rate: int = 16000) -> str:
    """Convert incremental WebM → WAV snapshot safely."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm", dir=AUDIO_DEBUG_DIR) as tmp_copy:
        snapshot_path = tmp_copy.name
        shutil.copy(input_path, snapshot_path)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav", dir=AUDIO_DEBUG_DIR) as tmp_wav:
        wav_path = tmp_wav.name

    try:
        (
            ffmpeg
            .input(snapshot_path, format="webm")
            .output(
                wav_path,
                format="wav",
                acodec="pcm_s16le",
                ac=1,
                ar=str(sample_rate)
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        os.remove(snapshot_path)
        print(f"✅ Converted WebM → WAV: {wav_path}")
        return wav_path
    except ffmpeg.Error as e:
        print("❌ FFmpeg failed:", e.stderr.decode(errors="ignore"))
        if os.path.exists(snapshot_path):
            os.remove(snapshot_path)
        raise RuntimeError("WebM → WAV conversion failed")


# ==========================================
# MAIN WEBSOCKET ENDPOINT
# ==========================================
@router.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    """
    Low-latency real-time captioning WebSocket.
    Transcribes 2s chunks asynchronously for near-live updates.
    """
    await websocket.accept()
    print("🎧 Live caption WebSocket connected.")

    # Reset file on connect
    if os.path.exists(LIVE_WEBM_PATH):
        os.remove(LIVE_WEBM_PATH)

    chunk_count = 0
    buffer_bytes = 0
    last_text = ""
    last_update_time = time.time()
    recent_bytes = bytearray()  # keep small overlap buffer

    try:
        while True:
            data = await websocket.receive_bytes()
            chunk_count += 1

            # Append to file for FFmpeg to read
            with open(LIVE_WEBM_PATH, "ab") as f:
                f.write(data)

            # Track rolling buffer size
            recent_bytes.extend(data)
            buffer_bytes += len(data)
            total_size = os.path.getsize(LIVE_WEBM_PATH)
            print(f"📦 Chunk #{chunk_count}: {len(data)} bytes (total={total_size})")

            # Trigger processing
            if buffer_bytes >= CHUNK_SIZE_THRESHOLD:
                await asyncio.sleep(0.2)  # ensure flush to disk

                try:
                    wav_path = convert_webm_to_wav_safe(LIVE_WEBM_PATH)

                    # Skip silence quickly
                    if not has_voice(wav_path):
                        print("🛑 Silence detected — skipping chunk.")
                        os.remove(wav_path)
                        buffer_bytes = 0
                        continue

                    # Offload Whisper to thread (non-blocking)
                    print("🎙️ Transcribing async...")
                    segments = await asyncio.to_thread(
                        transcribe_audio, wav_path, last_text
                    )

                    if not segments:
                        print("⚠️ Empty result, continuing.")
                        buffer_bytes = 0
                        continue

                    # Build current transcript
                    current_text = " ".join(seg["text"].strip() for seg in segments if seg["text"].strip())

                    if len(current_text) > len(last_text):
                        delta = current_text[len(last_text):].strip()
                        if delta:
                            print(f"🆕 Caption: '{delta}'")
                            await websocket.send_json({
                                "type": "caption_update",
                                "text": delta
                            })
                            last_text = current_text
                            last_update_time = time.time()
                    else:
                        print("⚠️ No new text yet.")

                    # Clean and prepare next round
                    if os.path.exists(wav_path):
                        os.remove(wav_path)

                    # Keep last second overlap
                    if len(recent_bytes) > OVERLAP_SIZE:
                        recent_bytes = recent_bytes[-OVERLAP_SIZE:]
                    buffer_bytes = len(recent_bytes)

                    # Reset if file too large
                    if total_size > MAX_FILE_SIZE:
                        os.remove(LIVE_WEBM_PATH)
                        print("♻️ Resetting file (too large).")

                    # Reset context after silence
                    if time.time() - last_update_time > SILENCE_TIMEOUT:
                        print("🧹 Resetting Whisper context (timeout).")
                        last_text = ""

                except Exception as e:
                    print(f"⚠️ Transcription failed: {e}")
                    await websocket.send_json({"error": str(e)})
                    buffer_bytes = 0

    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        await websocket.close()
    finally:
        print("🔌 Disconnected.")
