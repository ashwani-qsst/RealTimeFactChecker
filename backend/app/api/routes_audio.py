import os
import tempfile
import ffmpeg
from fastapi import APIRouter, WebSocket
from app.services.whisper_service import transcribe_audio
from app.services.diarization_service import diarize_audio
from app.utils.audio_utils import merge_transcript_and_speakers

router = APIRouter()

def convert_to_wav(input_bytes: bytes, sample_rate: int = 16000) -> str:
    """Convert raw or compressed audio bytes to proper WAV (16kHz mono)."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
        try:
            process = (
                ffmpeg
                .input('pipe:0')
                .output(tmp_out.name, format='wav', acodec='pcm_s16le', ac=1, ar=str(sample_rate))
                .run(input=input_bytes, capture_stdout=True, capture_stderr=True)
            )
            return tmp_out.name
        except ffmpeg.Error as e:
            print("❌ FFmpeg conversion error:", e.stderr.decode())
            os.remove(tmp_out.name)
            raise

@router.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    buffer = bytearray()

    print("🎧 WebSocket client connected.")

    try:
        while True:
            data = await websocket.receive_bytes()
            print("📦 Received chunk size:", len(data))
            buffer.extend(data)

            # Process every ~5 seconds of audio (16kHz * 5s * 2 bytes)
            if len(buffer) >= 16000 * 5 * 2:
                try:
                    # Convert received audio to valid WAV
                    wav_path = convert_to_wav(buffer)

                    print(f"✅ Saved and converted WAV: {wav_path}")

                    # Run transcription + diarization
                    transcript = transcribe_audio(wav_path)
                    diarization = diarize_audio(wav_path)
                    combined = merge_transcript_and_speakers(transcript, diarization)

                    await websocket.send_json(combined)
                    buffer.clear()
                    os.remove(wav_path)
                except Exception as e:
                    print(f"❌ Error during audio processing: {e}")
                    await websocket.send_json({"error": str(e)})
    except Exception as e:
        print(f"❌ WebSocket connection error: {e}")
        await websocket.close()
    finally:
        print("🔌 WebSocket client disconnected.")
