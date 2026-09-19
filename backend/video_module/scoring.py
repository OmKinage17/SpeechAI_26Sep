from typing import Dict, Any, List, Optional
from video_module.config import (
    DEFAULT_WEIGHTS,
    IDEAL_WPM_BANDS,
    REF_FILLER_RATE,
    REF_PAUSE_RATIO,
    REF_REPEAT_RATE,
    REF_GAZE_RATIO,
    REF_HEAD_SIGMA,
    REF_NEG_EMOTION_RATE
)

def compute_speech_scores(speech: Dict[str, Any], task_type: str = "free_talk") -> Dict[str, float]:
    """
    Computes Fluency (F) and Clarity (P) scores on a 0-100 scale.
    """
    word_count = max(1, speech.get("word_count", 0))
    filler_count = speech.get("filler_count", 0)
    repetition_count = speech.get("repetition_count", 0)
    pause_ratio = speech.get("pause_ratio", 0.0)
    wpm = speech.get("wpm", 0.0)
    clarity_raw = speech.get("clarity_raw", -0.5)

    # 1. Filler score (Eq. 2 & 3)
    r_filler = (filler_count / word_count) * 100.0
    s_filler = max(0.0, min(100.0, 100.0 * (1.0 - (r_filler / REF_FILLER_RATE))))

    # 2. Pause score (Eq. 15)
    s_pause = max(0.0, min(100.0, 100.0 * (1.0 - (pause_ratio / REF_PAUSE_RATIO))))

    # 3. Repetition score
    r_repeat = (repetition_count / word_count) * 100.0
    s_repeat = max(0.0, min(100.0, 100.0 * (1.0 - (r_repeat / REF_REPEAT_RATE))))

    # 4. Rate score (Eq. 4)
    wpm_min, wpm_max = IDEAL_WPM_BANDS.get(task_type, (120.0, 150.0))
    if wpm_min <= wpm <= wpm_max:
        s_rate = 100.0
    elif wpm < wpm_min:
        s_rate = max(0.0, 100.0 - ((wpm_min - wpm) * 1.5))
    else:
        s_rate = max(0.0, 100.0 - ((wpm - wpm_max) * 1.2))

    # Composite Fluency F (Eq. 16)
    F = round(0.25 * s_filler + 0.25 * s_pause + 0.25 * s_repeat + 0.25 * s_rate, 1)

    # Clarity P: Min-max normalization of Whisper avg_logprob (-1.5 to 0.0)
    # P = ((logprob - (-1.5)) / (0 - (-1.5))) * 100
    p_norm = ((clarity_raw + 1.5) / 1.5) * 100.0
    P = round(max(0.0, min(100.0, p_norm)), 1)

    return {
        "F": F,
        "P": P,
        "s_filler": round(s_filler, 1),
        "s_pause": round(s_pause, 1),
        "s_repeat": round(s_repeat, 1),
        "s_rate": round(s_rate, 1)
    }


def compute_visual_scores(visual: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """
    Computes Non-verbal (N) and Emotion (E) scores based on visual metrics.
    """
    face_presence = visual.get("face_presence_ratio", 0.0)
    if face_presence < 0.50:
        # Face absent in majority of frames -> mark N and E unavailable
        return {"N": None, "E": None}

    camera_facing = visual.get("camera_facing_ratio", 0.0)
    head_motion = visual.get("head_motion", 0.0)
    posture_ok = visual.get("posture_ok_ratio")

    # 1. Gaze / Camera-facing score
    s_gaze = min(100.0, (camera_facing / REF_GAZE_RATIO) * 100.0)

    # 2. Head stability score
    s_head = max(0.0, min(100.0, 100.0 * (1.0 - (head_motion / REF_HEAD_SIGMA))))

    # 3. Posture score
    if posture_ok is not None:
        s_posture = max(0.0, min(100.0, posture_ok * 100.0))
        N = round(0.40 * s_gaze + 0.30 * s_head + 0.30 * s_posture, 1)
    else:
        # Renormalize N when posture is out of frame
        N = round(0.55 * s_gaze + 0.45 * s_head, 1)

    # 4. Emotion score
    r_neg = visual.get("r_neg", 0.0)
    s_emotion = max(0.0, min(100.0, 100.0 * (1.0 - (r_neg / REF_NEG_EMOTION_RATE))))
    E = round(s_emotion, 1)

    return {
        "N": N,
        "E": E,
        "s_gaze": round(s_gaze, 1),
        "s_head": round(s_head, 1)
    }


def compute_overall_scores(
    f_score: Optional[float],
    p_score: Optional[float],
    n_score: Optional[float],
    e_score: Optional[float],
    g_score: Optional[float] = None,
    v_score: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes explainable weighted overall score with dynamic renormalization.
    """
    scores_map = {
        "F": f_score,
        "P": p_score,
        "N": n_score,
        "E": e_score,
        "G": g_score,
        "V": v_score
    }

    available_keys = [k for k, v in scores_map.items() if v is not None]
    unavailable_keys = [k for k, v in scores_map.items() if v is None]

    total_orig_weight = sum(DEFAULT_WEIGHTS[k] for k in available_keys)
    if total_orig_weight <= 0:
        return {
            "overall_100": 0.0,
            "overall_10": 0.0,
            "weights_used": {},
            "unavailable": unavailable_keys
        }

    # Dynamic renormalization across available modalities
    renormalized_weights = {
        k: round(DEFAULT_WEIGHTS[k] / total_orig_weight, 4)
        for k in available_keys
    }

    weighted_sum = sum(scores_map[k] * renormalized_weights[k] for k in available_keys)
    overall_100 = round(float(weighted_sum), 1)
    overall_10 = round(float(overall_100 / 10.0), 1)

    return {
        "F": f_score,
        "P": p_score,
        "N": n_score,
        "E": e_score,
        "G": g_score,
        "V": v_score,
        "overall_100": overall_100,
        "overall_10": overall_10,
        "weights_used": renormalized_weights,
        "unavailable": unavailable_keys
    }
