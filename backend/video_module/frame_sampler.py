import os
import subprocess
import logging
import glob
from typing import List, Tuple
from video_module.config import FRAME_SAMPLE_FPS

logger = logging.getLogger("Module3_FrameSampler")

def sample_frames(video_path: str, output_dir: str, fps: float = FRAME_SAMPLE_FPS) -> List[Tuple[float, str]]:
    """
    Extracts frames at given FPS using FFmpeg.
    Returns list of tuples: [(timestamp_sec, frame_filepath), ...]
    """
    os.makedirs(output_dir, exist_ok=True)
    pattern = os.path.join(output_dir, "frame_%05d.jpg")
    
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vf", f"fps={fps},scale=640:-1",
        "-q:v", "3",
        pattern
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception as e:
        logger.error(f"FFmpeg frame extraction failed: {e}")
        return []

    frame_files = sorted(glob.glob(os.path.join(output_dir, "frame_*.jpg")))
    results: List[Tuple[float, str]] = []
    
    for i, fpath in enumerate(frame_files):
        timestamp = round(i / fps, 3)
        results.append((timestamp, fpath))
        
    logger.info(f"Sampled {len(results)} frames from {video_path} at {fps} FPS.")
    return results
