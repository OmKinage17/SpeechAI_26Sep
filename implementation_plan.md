# Implementation Plan - Days 1-2: Setup & Core Pipeline

This plan covers the initial setup and core pipeline for the **AI-Based Speech Therapy System**. Our milestone for Days 1-2 is to record audio in the React frontend, upload it to the FastAPI backend, process it, run Whisper transcription, and return the transcript to the frontend.

## User Review Required

> [!IMPORTANT]
> - **FFmpeg Dependency**: FFmpeg is required for Whisper and Librosa to process audio. Since `ffmpeg` is not in the system PATH, we propose installing the `static-ffmpeg` Python package which automatically fetches and configures FFmpeg binaries, or downloading it programmatically within the backend setup.
> - **Whisper Model**: We will start with the Whisper `base` model. It strikes a good balance between transcription quality and processing speed when running locally on CPU.
> - **Database**: Local MongoDB is verified as running on port 27017. We will connect directly to it.

## Open Questions

> [!WARNING]
> 1. **Accents and Model Size**: Do you want to run with the `base` model (faster, ~70MB) or the `small` model (more accurate for Indian English, ~460MB)? We recommend starting with `base` for development speed, but we can easily configure it to `small` or `medium` later.
> 2. **MongoDB Authentication**: Does your local MongoDB require credentials, or can we connect to `mongodb://localhost:27017` with no auth? We assume no auth initially.

## Proposed Changes

We will initialize the codebase structure in `e:\SpeechPrj`.

### Backend Setup

We will create a FastAPI app in `e:\SpeechPrj\backend`.

#### [NEW] [requirements.txt](file:///e:/SpeechPrj/backend/requirements.txt)
Define backend packages:
- `fastapi`
- `uvicorn`
- `pymongo`
- `motor` (async MongoDB driver)
- `python-multipart` (for handling file uploads)
- `librosa`
- `soundfile`
- `numpy`
- `jiwer` (for Word Error Rate calculation in Module 1)
- `openai-whisper`
- `static-ffmpeg` (to provide local FFmpeg binaries)

#### [NEW] [main.py](file:///e:/SpeechPrj/backend/main.py)
Initialize the FastAPI app with:
- CORS middleware configured for frontend communication.
- A test endpoint `GET /` to verify backend status.
- An upload endpoint `POST /practice/submit` and `/analyze/speech` which accepts `audio` (UploadFile), saves it, converts it to 16kHz mono WAV, runs Whisper, and returns the transcript.

#### [NEW] [audio_utils.py](file:///e:/SpeechPrj/backend/audio_utils.py)
Helper functions to convert audio to WAV format at 16kHz mono using FFmpeg (leveraging `static-ffmpeg` paths if needed).

---

### Frontend Setup

We will create a React SPA in `e:\SpeechPrj\frontend`.

#### [NEW] Frontend Skeleton via Vite
Initialize a React + Vite + TypeScript application in `e:\SpeechPrj\frontend`.
We will install necessary client libraries:
- `lucide-react` (for icons)
- `recharts` (for dashboard charts)
- `canvas-confetti` (for milestones)

#### [NEW] [App.jsx](file:///e:/SpeechPrj/frontend/src/App.jsx)
Create a clean, premium dashboard UI using modern typography (Inter) and CSS featuring:
- A navigation bar.
- An interactive component for recording audio with live visual feedback.
- A call-to-action to switch between Module 1 (Practice Trainer) and Module 2 (Fluency Analysis).

---

## Verification Plan

### Automated Tests
- Verification script `verify_whisper.py` to check that Whisper transcription runs successfully on a dummy audio sample.

### Manual Verification
1. Run backend using `uvicorn main:app --reload` on port 8000.
2. Run frontend using `npm run dev` on port 5173.
3. Open browser to frontend, record a short sentence, and verify that the transcription result is returned and displayed on the UI.
