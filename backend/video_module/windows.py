import numpy as np
from typing import List, Dict, Any
from video_module.config import FUSION_WINDOW_SEC

def generate_fusion_timeline(
    duration_sec: float,
    words_list: List[Dict[str, Any]],
    pause_events: List[Dict[str, Any]],
    frame_metrics: List[Dict[str, Any]],
    frame_emotions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Fuses speech and vision metrics across 5-second windows.
    """
    timeline: List[Dict[str, Any]] = []
    if duration_sec <= 0:
        return timeline

    num_windows = max(1, int(np.ceil(duration_sec / FUSION_WINDOW_SEC)))

    for i in range(num_windows):
        t_start = round(i * FUSION_WINDOW_SEC, 1)
        t_end = round(min(duration_sec, (i + 1) * FUSION_WINDOW_SEC), 1)
        w_duration = max(0.5, t_end - t_start)

        # 1. Words in this window
        w_words = [
            w for w in words_list
            if (t_start <= w.get("start", 0.0) < t_end) or (t_start <= w.get("end", 0.0) <= t_end)
        ]
        w_word_count = len(w_words)
        w_wpm = round((w_word_count / (w_duration / 60.0)), 1) if w_duration > 0 else 0.0

        # Fillers in window
        filler_words = {"um", "uh", "like", "actually", "basically", "so", "you know"}
        w_fillers = sum(1 for w in w_words if w.get("word", "").strip().lower() in filler_words)

        # 2. Pauses in this window
        w_pause_sec = 0.0
        for p in pause_events:
            p_s = max(t_start, p.get("start", 0.0))
            p_e = min(t_end, p.get("end", 0.0))
            if p_e > p_s:
                w_pause_sec += (p_e - p_s)
        w_pause_ratio = round(min(1.0, w_pause_sec / w_duration), 2)

        # 3. Visual frames in this window
        w_frames = [
            f for f in frame_metrics
            if t_start <= f.get("timestamp", 0.0) < t_end
        ]
        
        w_facing_ratio = 1.0
        w_head_motion = 0.0
        
        if w_frames:
            facing_count = sum(1 for f in w_frames if f.get("camera_facing"))
            w_facing_ratio = round(facing_count / len(w_frames), 2)

            noses = [f["normalized_nose"] for f in w_frames if "normalized_nose" in f]
            if len(noses) > 1:
                xs = [n[0] for n in noses]
                ys = [n[1] for n in noses]
                w_head_motion = round(float(np.sqrt(np.var(xs) + np.var(ys))), 4)

        # 4. Dominant emotion in window
        w_dominant_emotion = "neutral"

        # 5. Cross-modal anomaly flags
        flags: List[str] = []
        if w_wpm > 155.0 and w_facing_ratio < 0.45:
            flags.append("Fast speech while breaking eye contact")
        if w_pause_ratio > 0.45 and w_facing_ratio < 0.40:
            flags.append("Hesitation with gaze aversion")
        if w_fillers >= 2 and w_head_motion > 0.08:
            flags.append("Filler cluster with head movement")

        timeline.append({
            "t_start": t_start,
            "t_end": t_end,
            "wpm": w_wpm,
            "filler_count": int(w_fillers),
            "pause_ratio": float(w_pause_ratio),
            "camera_facing": float(w_facing_ratio),
            "head_motion": float(w_head_motion),
            "dominant_emotion": w_dominant_emotion,
            "flags": flags
        })

    return timeline
