import torch
from faster_whisper import WhisperModel

# Load Whisper model (small is best balance for real-time)
model = WhisperModel("tiny.en", device="cuda" if torch.cuda.is_available() else "cpu")

def transcribe_audio(file_path: str):
    """
    Transcribe a short audio file using faster-whisper.
    """
    segments, info = model.transcribe(file_path, beam_size=5)
    transcript = []
    for segment in segments:
        transcript.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip()
        })
    return transcript