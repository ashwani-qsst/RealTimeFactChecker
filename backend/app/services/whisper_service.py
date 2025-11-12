import torch
from faster_whisper import WhisperModel

# Load a smaller, faster model
model = WhisperModel("tiny", device="cuda" if torch.cuda.is_available() else "cpu")

def transcribe_audio(file_path: str, prev_text: str = ""):
    """
    Fast Whisper transcription with context continuity.
    """
    segments, info = model.transcribe(
        file_path,
        beam_size=1,                # much faster, fine for live
        initial_prompt=prev_text or None,
        vad_filter=True             # skip long silences automatically
    )
    transcript = []
    for segment in segments:
        transcript.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip()
        })
    return transcript
