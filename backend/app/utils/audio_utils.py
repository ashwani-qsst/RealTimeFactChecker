from typing import List, Dict, Any
from pyannote.core import Annotation, Segment

def clean_and_align_transcript(
    transcript: List[Dict[str, Any]], 
    audio_duration: float = None
) -> List[Dict[str, Any]]:
    """
    Preprocess Whisper transcript:
    - Round timestamps to nearest 0.1s
    - Ensure non-negative start/end
    - Clamp within audio duration if provided
    """
    cleaned = []

    for seg in transcript:
        start = max(0.0, round(float(seg.get("start", 0.0)), 1))
        end = round(float(seg.get("end", start + 0.1)), 1)
        text = seg.get("text", "").strip()

        # Skip empty or invalid
        if not text or end <= start:
            continue

        # Clamp to valid duration
        if audio_duration:
            start = min(start, audio_duration)
            end = min(end, audio_duration)

        cleaned.append({"start": start, "end": end, "text": text})

    return cleaned


def merge_transcript_and_speakers(
    transcript: List[Dict[str, Any]], diarization: Annotation, audio_duration: float = None
) -> List[Dict[str, Any]]:
    """
    Merge Whisper transcript with Pyannote diarization.
    Handles timing misalignments robustly.
    """

    if not isinstance(diarization, Annotation):
        raise TypeError(
            f"merge_transcript_and_speakers: Diarization format invalid: {type(diarization)}"
        )

    # 🧹 Step 1: Clean & align transcript
    transcript = clean_and_align_transcript(transcript, audio_duration)

    merged = []

    # 🧩 Step 2: For each transcript segment, find matching speaker
    for seg in transcript:
        start = seg["start"]
        end = seg["end"]
        text = seg["text"]

        # Crop diarization for the time range
        overlapping = diarization.crop(Segment(start, end))

        if len(overlapping) == 0:
            merged.append(
                {"speaker": "Unknown", "start": start, "end": end, "text": text}
            )
            continue

        # Determine dominant speaker (by overlap duration)
        speaker_durations = {}
        for s, _, label in overlapping.itertracks(yield_label=True):
            overlap = min(end, s.end) - max(start, s.start)
            if overlap > 0:
                speaker_durations[label] = speaker_durations.get(label, 0) + overlap

        dominant_speaker = (
            max(speaker_durations, key=speaker_durations.get)
            if speaker_durations
            else "Unknown"
        )

        merged.append(
            {
                "speaker": dominant_speaker,
                "start": start,
                "end": end,
                "text": text,
            }
        )

    print(f"✅ Merged {len(merged)} transcript segments with speaker info.")
    return merged
