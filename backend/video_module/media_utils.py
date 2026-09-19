import os
import subprocess
import logging
import json
from typing import Dict, Any
import static_ffmpeg

logger = logging.getLogger("Module3_MediaUtils")

try:
    static_ffmpeg.add_paths()
except Exception as e:
    logger.warning(f"static-ffmpeg notice: {e}")

def extract_audio(video_path: str, output_wav_path: str) -> bool:
    """
    Extracts 16 kHz mono WAV audio from input video file using FFmpeg.
    """
    if not os.path.exists(video_path):
        logger.error(f"Input video file not found: {video_path}")
        return False

    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        output_wav_path
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.exists(output_wav_path) and os.path.getsize(output_wav_path) > 0
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode('utf-8', errors='ignore') if e.stderr else ""
        logger.warning(f"FFmpeg audio extraction failed (clip may lack audio track): {stderr}")
        return False
    except Exception as e:
        logger.error(f"Error during audio extraction: {e}")
        return False

def probe_video(video_path: str) -> Dict[str, Any]:
    """
    Probes video duration and metadata using ffprobe.
    """
    info = {
        "duration_sec": 0.0,
        "width": 640,
        "height": 480,
        "has_audio": False,
        "has_video": False
    }
    
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration:stream=codec_type,width,height",
        "-of", "json",
        video_path
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        data = json.loads(res.stdout.decode('utf-8'))
        
        if "format" in data and "duration" in data["format"]:
            info["duration_sec"] = float(data["format"]["duration"])
            
        if "streams" in data:
            for s in data["streams"]:
                if s.get("codec_type") == "video":
                    info["has_video"] = True
                    info["width"] = s.get("width", 640)
                    info["height"] = s.get("height", 480)
                elif s.get("codec_type") == "audio":
                    info["has_audio"] = True
    except Exception as e:
        logger.warning(f"Failed to probe video with ffprobe: {e}")
        
    return info
