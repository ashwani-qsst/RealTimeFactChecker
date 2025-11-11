import os
import ffmpeg
import tempfile
import shutil
from fastapi import APIRouter, WebSocket
from app.services.whisper_service import transcribe_audio

router = APIRouter()

AUDIO_DEBUG_DIR = os.path.join(os.getcwd(), "audio_debug")
os.makedirs(AUDIO_DEBUG_DIR, exist_ok=True)
LIVE_WEBM_PATH = os.path.join(AUDIO_DEBUG_DIR, "live_audio_stream.webm")


def convert_webm_to_wav_safe(input_path: str, sample_rate: int = 16000) -> str:
    """Safely convert cumulative WebM → WAV by snapshotting the file."""
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
        print(f"✅ Converted WebM → WAV: {wav_path}")
        os.remove(snapshot_path)
        return wav_path
    except ffmpeg.Error as e:
        print("❌ FFmpeg failed:", e.stderr.decode(errors="ignore"))
        if os.path.exists(snapshot_path):
            os.remove(snapshot_path)
        raise RuntimeError("WebM → WAV conversion failed")


@router.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time captioning WebSocket.
    Keeps appending to one .webm file and sends only *new* speech from Whisper.
    """
    await websocket.accept()
    print("🎧 Live caption WebSocket connected.")

    if os.path.exists(LIVE_WEBM_PATH):
        os.remove(LIVE_WEBM_PATH)

    chunk_count = 0
    buffer_bytes = 0
    last_text = ""

    try:
        while True:
            data = await websocket.receive_bytes()
            chunk_count += 1

            # Append chunk
            with open(LIVE_WEBM_PATH, "ab") as f:
                f.write(data)

            buffer_bytes += len(data)
            print(f"📦 Received chunk #{chunk_count}: {len(data)} bytes (total file={os.path.getsize(LIVE_WEBM_PATH)})")

            # Process every ~130 KB accumulated
            if buffer_bytes >= 130_000:
                try:
                    wav_path = convert_webm_to_wav_safe(LIVE_WEBM_PATH)

                    print("🎙️ Running Whisper transcription...")
                    segments = transcribe_audio(wav_path)

                    if not segments:
                        print("⚠️ No speech detected.")
                        buffer_bytes = 0
                        continue

                    current_text = " ".join(seg["text"].strip() for seg in segments if seg["text"].strip())

                    if len(current_text) > len(last_text):
                        delta = current_text[len(last_text):].strip()
                        if delta:
                            print(f"🆕 Live caption update: '{delta}'")
                            await websocket.send_json({
                                "type": "caption_update",
                                "text": delta
                            })
                            last_text = current_text
                        else:
                            print("⚠️ Whisper returned same text, skipping.")
                    else:
                        print("⚠️ No new text detected yet.")

                    buffer_bytes = 0
                    os.remove(wav_path)

                    # Reset stream every ~2 MB
                    if os.path.getsize(LIVE_WEBM_PATH) > 2_000_000:
                        os.remove(LIVE_WEBM_PATH)
                        print("♻️ Resetting stream file for fresh capture.")

                except Exception as e:
                    print(f"⚠️ Live transcription failed: {e}")
                    await websocket.send_json({"error": str(e)})
                    buffer_bytes = 0

    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        await websocket.close()
    finally:
        print("🔌 WebSocket disconnected.")
