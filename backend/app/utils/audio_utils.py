def merge_transcript_and_speakers(transcript, diarization):
    """
    Merge Whisper transcript and diarization segments by timestamps.
    """
    merged = []
    for t in transcript:
        # Find speaker whose time range overlaps
        speaker = "Unknown"
        for d in diarization:
            if d["start"] <= t["start"] <= d["end"]:
                speaker = d["speaker"]
                break
        merged.append({
            "speaker": speaker,
            "text": t["text"],
            "start": t["start"],
            "end": t["end"]
        })
    return merged