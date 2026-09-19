import os
from typing import Dict, Tuple

# Database Configuration
COLLECTION_NAME = "video_sessions"

# Temporary file storage for video/audio frames
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_media")
os.makedirs(TEMP_DIR, exist_ok=True)

# Upload limits
MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB
MAX_DURATION_SEC = 180.0               # 3 minutes

# Frame and Sampling Rates
FRAME_SAMPLE_FPS = 5.0   # 5 FPS extraction via FFmpeg
EMOTION_SAMPLE_FPS = 1.0 # 1 FPS face crops
FUSION_WINDOW_SEC = 5.0  # 5-second synchronized windows

# Speech metrics thresholds
LONG_PAUSE_SEC = 1.5
IDEAL_WPM_BANDS: Dict[str, Tuple[float, float]] = {
    "free_talk": (120.0, 150.0),
    "interview": (110.0, 140.0),
    "custom_topic": (120.0, 150.0),
    "paragraph": (120.0, 150.0),
    "presentation": (125.0, 155.0)
}
REF_FILLER_RATE = 4.0      # 4%
REF_PAUSE_RATIO = 0.25     # 25%
REF_REPEAT_RATE = 2.0      # 2 per 100 words

# Visual metric references
REF_GAZE_RATIO = 0.70       # 70% camera-facing is target
REF_HEAD_SIGMA = 0.06       # Head movement standard deviation reference
REF_SHOULDER_TILT_DEG = 8.0 # Max shoulder tilt
REF_NEG_EMOTION_RATE = 0.40 # 40% negative emotion threshold
MIN_FACE_PRESENCE_RATIO = 0.50

# Quality thresholds
MIN_BRIGHTNESS = 40.0
MAX_BRIGHTNESS = 220.0
MIN_FACE_AREA_RATIO = 0.03

# Multimodal Scoring Dimension Weights
DEFAULT_WEIGHTS: Dict[str, float] = {
    "F": 0.30,  # Fluency
    "P": 0.15,  # Speech clarity
    "N": 0.25,  # Non-verbal
    "E": 0.10,  # Emotion balance
    "G": 0.10,  # Grammar (optional)
    "V": 0.10   # Vocabulary (optional)
}

ENABLE_EMOTION = os.getenv("ENABLE_EMOTION", "true").lower() in ("true", "1", "yes")
