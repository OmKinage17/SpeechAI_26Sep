import re
from typing import Dict, Any, List, Tuple
from video_module.config import LONG_PAUSE_SEC

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def detect_fillers(transcript: str) -> Tuple[int, List[str]]:
    text_lower = transcript.lower()
    filler_count = 0
    fillers_found = []

    phrase_fillers = ["you know"]
    remaining_text = text_lower
    for phrase in phrase_fillers:
        pattern = rf'\b{phrase}\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_count += len(matches)
            fillers_found.append(phrase)
            remaining_text = re.sub(pattern, ' ', remaining_text)

    single_word_fillers = ["um", "uh", "like", "actually", "basically", "so"]
    cleaned_remaining = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?]', ' ', remaining_text)
    words = cleaned_remaining.split()
    for w in words:
        if w in single_word_fillers:
            filler_count += 1
            if w not in fillers_found:
                fillers_found.append(w)

    return filler_count, fillers_found

def detect_repetitions(transcript: str) -> int:
    text_lower = transcript.lower()
    rep_events = 0

    reps_3 = re.findall(r'\b([a-zA-Z]{1,3})-\1-\1\b', text_lower)
    cleaned_text = re.sub(r'\b([a-zA-Z]{1,3})-\1-\1\b', ' ', text_lower)
    reps_2 = re.findall(r'\b([a-zA-Z]{1,3})-\1\b', cleaned_text)
    rep_events += len(reps_3) + len(reps_2)

    words = clean_text(text_lower).split()
    for i in range(len(words) - 1):
        if words[i] == words[i+1]:
            rep_events += 1

    return rep_events

def extract_speech_features(whisper_result: Dict[str, Any], total_duration_sec: float) -> Dict[str, Any]:
    """
    Extracts speech metrics from Whisper output: WPM, fillers, pauses, repetitions, clarity.
    """
    transcript = whisper_result.get("text", "").strip()
    segments = whisper_result.get("segments", [])

    words_list = []
    avg_logprobs = []
    for seg in segments:
        if "words" in seg:
            words_list.extend(seg["words"])
        if "avg_logprob" in seg:
            avg_logprobs.append(seg["avg_logprob"])

    word_count = len(words_list)
    if word_count == 0:
        word_count = len(transcript.split())

    # Duration calculation
    effective_duration_sec = total_duration_sec
    if effective_duration_sec <= 0 and segments:
        effective_duration_sec = segments[-1].get("end", 1.0)
    effective_duration_sec = max(1.0, effective_duration_sec)

    # Speech rate (WPM)
    duration_min = effective_duration_sec / 60.0
    wpm = round(word_count / duration_min, 1) if duration_min > 0 else 0.0

    # Fillers & Repetitions
    filler_count, filler_types = detect_fillers(transcript)
    repetition_count = detect_repetitions(transcript)

    # Pause detection
    long_pauses = 0
    total_pause_time = 0.0
    pause_events = []
    
    if len(words_list) > 1:
        for i in range(len(words_list) - 1):
            curr_end = words_list[i].get("end", 0.0)
            next_start = words_list[i+1].get("start", 0.0)
            gap = next_start - curr_end
            if gap > LONG_PAUSE_SEC:
                long_pauses += 1
                total_pause_time += gap
                pause_events.append({
                    "start": round(curr_end, 2),
                    "end": round(next_start, 2),
                    "duration": round(gap, 2)
                })

    pause_ratio = round(total_pause_time / effective_duration_sec, 3)

    # Clarity proxy (Whisper average logprob)
    mean_logprob = sum(avg_logprobs) / len(avg_logprobs) if avg_logprobs else -0.5

    return {
        "transcript": transcript,
        "word_count": int(word_count),
        "wpm": float(wpm),
        "filler_count": int(filler_count),
        "filler_types": filler_types,
        "repetition_count": int(repetition_count),
        "long_pauses": int(long_pauses),
        "total_pause_time": round(total_pause_time, 2),
        "pause_ratio": float(pause_ratio),
        "pause_events": pause_events,
        "clarity_raw": round(mean_logprob, 3),
        "words_list": words_list
    }
