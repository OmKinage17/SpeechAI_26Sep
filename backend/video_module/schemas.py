from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class VideoJobResponse(BaseModel):
    job_id: str
    status: str  # QUEUED, PROCESSING, COMPLETED, FAILED
    stage: str   # queued, extracting_audio, transcribing, video_analysis, scoring, done
    error: Optional[str] = None
    created_at: str

class SpeechFeatures(BaseModel):
    transcript: str
    word_count: int
    wpm: float
    filler_count: int
    filler_types: List[str]
    repetition_count: int
    long_pauses: int
    pause_ratio: float
    clarity_raw: float

class VisualFeatures(BaseModel):
    face_presence_ratio: float
    camera_facing_ratio: float
    head_motion: float
    posture_ok_ratio: Optional[float] = None
    dominant_emotion: Optional[str] = "neutral"
    emotion_distribution: Optional[Dict[str, float]] = None
    brightness_mean: float

class WindowTimelineItem(BaseModel):
    t_start: float
    t_end: float
    wpm: float
    filler_count: int
    pause_ratio: float
    camera_facing: float
    head_motion: float
    dominant_emotion: str
    flags: List[str]

class ScoresBreakdown(BaseModel):
    F: Optional[float] = None
    P: Optional[float] = None
    N: Optional[float] = None
    E: Optional[float] = None
    G: Optional[float] = None
    V: Optional[float] = None
    overall_100: float
    overall_10: float
    weights_used: Dict[str, float]
    unavailable: List[str]

class FeedbackItem(BaseModel):
    category: str
    severity: str
    message: str

class VideoSessionDetail(BaseModel):
    id: str
    user_id: str
    status: str
    stage: str
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    task_type: str
    prompt_text: Optional[str] = None
    duration_sec: float
    speech: Optional[SpeechFeatures] = None
    visual: Optional[VisualFeatures] = None
    timeline: List[WindowTimelineItem] = []
    scores: Optional[ScoresBreakdown] = None
    feedback: List[FeedbackItem] = []
    quality_warnings: List[str] = []
    timings: Dict[str, float] = {}
    rtf: Optional[float] = None
