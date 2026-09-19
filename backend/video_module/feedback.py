from typing import List, Dict, Any

def generate_multimodal_feedback(
    speech: Dict[str, Any],
    visual: Dict[str, Any],
    scores: Dict[str, Any]
) -> List[Dict[str, str]]:
    """
    Rule-based communication and delivery feedback generator.
    Categorized into 'speech', 'non_verbal', and 'recording_quality'.
    """
    feedback: List[Dict[str, str]] = []

    # 1. Speech Feedback
    filler_count = speech.get("filler_count", 0)
    word_count = max(1, speech.get("word_count", 0))
    filler_rate = (filler_count / word_count) * 100.0

    if filler_rate > 4.0:
        feedback.append({
            "category": "speech",
            "severity": "tip",
            "message": f"Used {filler_count} filler words ({', '.join(speech.get('filler_types', []))}). Replace fillers with brief silent pauses to sound more poised."
        })

    wpm = speech.get("wpm", 0.0)
    if wpm > 155.0:
        feedback.append({
            "category": "speech",
            "severity": "tip",
            "message": f"Your speech tempo of {wpm} WPM is faster than optimal. Slowing down slightly improves articulation clarity."
        })
    elif wpm < 110.0 and wpm > 0.0:
        feedback.append({
            "category": "speech",
            "severity": "tip",
            "message": f"Your pace of {wpm} WPM is slower than typical conversational flow. Practice timed drills to build fluid momentum."
        })

    long_pauses = speech.get("long_pauses", 0)
    if long_pauses >= 3 or speech.get("pause_ratio", 0.0) > 0.25:
        feedback.append({
            "category": "speech",
            "severity": "tip",
            "message": f"Detected {long_pauses} long pauses (> 1.5s). Practice sentence chunking to maintain rhythmic phrase flow."
        })

    repetition_count = speech.get("repetition_count", 0)
    if repetition_count > 0:
        feedback.append({
            "category": "speech",
            "severity": "tip",
            "message": f"Identified {repetition_count} sound/word repetitions. Elongate initial vowels to ease articulation blocks."
        })

    # 2. Non-Verbal & Body Language Feedback
    face_presence = visual.get("face_presence_ratio", 0.0)
    camera_facing = visual.get("camera_facing_ratio", 0.0)
    if face_presence >= 0.50:
        if camera_facing < 0.50:
            feedback.append({
                "category": "non_verbal",
                "severity": "tip",
                "message": f"Camera-facing eye contact was maintained for {int(camera_facing * 100)}% of the session. Aim for 70%+ eye contact when delivering key ideas."
            })

        head_motion = visual.get("head_motion", 0.0)
        if head_motion > 0.07:
            feedback.append({
                "category": "non_verbal",
                "severity": "tip",
                "message": "Noticeable head tilting and movements were observed during speaking. Keep your head upright and centered."
            })

        posture_ok = visual.get("posture_ok_ratio")
        if posture_ok is not None and posture_ok < 0.65:
            feedback.append({
                "category": "non_verbal",
                "severity": "tip",
                "message": "Shoulder alignment deviated from level. Ground yourself upright with shoulders relaxed and balanced."
            })

    # Default positive reinforcement if doing well
    if not feedback:
        feedback.append({
            "category": "speech",
            "severity": "success",
            "message": "Outstanding delivery! Your vocal pacing, eye gaze engagement, and postural composure are well balanced."
        })

    return feedback
