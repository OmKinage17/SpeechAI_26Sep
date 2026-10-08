# SpeechAI System Overview

## 1. Project Summary
SpeechAI is an AI-driven speech therapy and fluency training system. It provides an integrated web UI and backend API for Pronunciation Practice, Fluency Analysis, and Exercise-Based Speech Drills. The platform uses speech-to-text transcription, pronunciation scoring, filler/stammer detection, timing analysis, and AI feedback to help users improve clarity, pacing, and confidence.

## 2. Architecture & Stack
### 2.1 Technology Stack
- Frontend
  - React + TypeScript
  - Vite
  - Recharts for chart visualizations
  - Lucide icons
  - canvas-confetti for reward animation
- Backend
  - Python FastAPI
  - Uvicorn ASGI server
  - MongoDB for persistence
  - whisper (OpenAI Whisper) for speech transcription
  - jiwer for word error rate (WER) evaluation
  - httpx for HTTP requests to AI generation endpoints
- Audio Processing
  - `audio_utils.convert_to_wav` for internal WebM/WAV conversion
  - browser MediaRecorder for recording audio
  - browser SpeechRecognition for live transcript display

### 2.2 System Architecture
- Frontend calls backend APIs over HTTP
- Backend stores users, sessions, exercises, and video analysis jobs in MongoDB
- Whisper model is loaded lazily on the backend and reused across requests
- Backend analytics use both exact metrics (WER, pauses, speed) and derived scores
- UI presents:
  - Dashboard metrics and history
  - Module 1: Fluency Tracker (impromptu speaking, custom passages, pronunciation alignment, disfluency tracking)
  - Module 2: Video Analysis (multimodal facial expressions, eye contact, head pose, posture, and speech)
  - Exercise drill library and guided clinical practice

## 3. Data Flow & Working Flow
### 3.1 User Authentication
- Routes:
  - `POST /auth/register`
  - `POST /auth/login`
- Uses HMAC token generation and verification
- Tokens stored in localStorage and sent as `Authorization: Bearer <token>`
- If auth is missing, the system uses `user_anonymous`

### 3.2 Content Generation
- Route: `GET /practice/generate`
- Inputs:
  - `topic`
  - `length` (`sentence`, `paragraph`, `long_paragraph`)
  - `level` (`easy`, `medium`, `difficult`)
  - `exercise_id` (optional)
- Behavior:
  - If API key present, calls Groq AI via OpenAI-like chat completions
  - Otherwise returns local fallback templates
- Purpose:
  - Generate reading passages tailored to topic keywords, difficulty, or therapy drill objectives

### 3.3 Module 1: Speech Fluency Tracker & Pronunciation Alignment
- Route: `POST /analyze/speech`
- Inputs:
  - `audio` (multipart audio recording)
  - optional `target_sentence` (target passage for pronunciation alignment)
  - optional `exercise_id`, `exercise_title`
- Flow & Features Evaluated:
  1. Receive recording and convert to 16 kHz mono WAV via `audio_utils.convert_to_wav`
  2. Transcribe speech using Whisper ASR with segment confidence logging
  3. If `target_sentence` provided:
     - Clean both target and spoken text
     - Compute Word Error Rate (WER) via `jiwer`
     - Align words and record mismatched words
  4. Disfluency analytics:
     - duration (`duration_sec`) and word count
     - speech rate (`wpm`)
     - filler word count and specific filler types (`filler_details`)
     - stammer / repetition count and timestamps (`stammer_details`)
     - long pause detection (>1.5s) and timestamps (`pause_details`)
     - acoustic clarity score derived from Whisper segment log probabilities
  5. Composite Fluency Scoring (0–10 scale):
     - filler score: 20%
     - stammer score: 25%
     - pause score: 20%
     - rate score: 20% (ideal: 120–150 WPM)
     - clarity score: 15%
  6. Clinical recommendations and optional Groq AI pathologist feedback
  7. Persist session to MongoDB under `analysis_sessions`
  8. Return structured metrics, feedback, and streak count

### 3.4 Module 2: Video & Multimodal Communication Analysis
- Routes:
  - `POST /video/analyze` — submit video recording for asynchronous background analysis
  - `GET /video/session/{job_id}` — poll job progress and fetch final multimodal report
  - `GET /video/reports/{user_id}` — fetch past video communication reports
  - `DELETE /video/session/{job_id}` — delete session recording
  - `GET /video/health` — video analysis module health check
- Features Evaluated:
  - Visual metrics via MediaPipe Face Mesh & Pose:
    - Eye contact ratio (% looking toward camera)
    - Smile ratio (% facial expression positivity)
    - Head orientation & stability (nodding, tilting, turning)
    - Shoulder / posture stability (fidgeting, leaning)
  - Acoustic & verbal metrics via Whisper:
    - Speech rate (WPM), pauses, fillers, articulation clarity
  - Multimodal integration:
    - Visual score (0–100)
    - Speech score (0–100)
    - Overall communication impact score (0–100)
    - Multimodal coaching feedback & improvement tips

### 3.5 Exercise Drills & Recommendations
- Route: `GET /exercises`
- Exercise metadata includes:
  - `_id`
  - `title`
  - `description`
  - `difficulty`
  - `trigger_condition`
- Recommended exercises are selected by rules evaluated against analysis context
- Example trigger conditions:
  - fill rate
  - stammer score
  - pause score
  - wpm outside ideal band

## 4. Project Structure
### `backend/`
- `main.py` — API entrypoint, model logic, scoring, auth, persistence
- `audio_utils.py` — audio conversion helper utilities
- `requirements.txt` — Python dependency list
- `run_all_tests.py` + tests — backend verification scripts

### `frontend/`
- `src/App.tsx` — single-page app with all UI and state logic
- `public/` — static assets
- `package.json` — dependencies and scripts
- `tsconfig.json` — TypeScript config
- `vite.config.ts` — build config

## 5. Frontend Module Behavior
### 5.1 Dashboard
- Fetches `/reports/{user_id}`
- Displays:
  - streak count
  - average practice score
  - average fluency score
  - total fluency sessions count
  - line chart for Module 1 Fluency Progress Trend (0–10 scale)
  - history timeline tabs for Module 1 Fluency and Exercise History
- History is grouped by `type`:
  - `analysis` (Module 1)
  - `exercise` (Therapy drills)

### 5.2 Module 1: Fluency Tracker
- Uses browser microphone to record speech audio
- Supports both impromptu speaking (prompt cards) and guided passage reading (Groq AI generator or custom text)
- Sends audio to `POST /analyze/speech`
- Displays:
  - Overall Fluency Score (0–10)
  - Interactive waveform playback and user audio review
  - Disfluency timelines and tagged chips for filler words, stammers, and long pauses
  - Real-time client speech recognition feed (Web Speech API)
  - Pronunciation word alignment & accuracy when practicing with a target reading passage
  - Five sub-scores (filler, stammer, pause, rate, clarity)
  - Therapy feedback and recommended clinical exercises

### 5.3 Module 2: Video & Communication Analysis
- Records or uploads video files (.mp4, .webm)
- Sends video to `POST /video/analyze`
- Displays:
  - Multimodal Communication Score (0–100)
  - Visual breakdown: eye contact ratio, smile ratio, head pose stability, posture stability
  - Verbal breakdown: speech rate (WPM), pauses, fillers, articulation clarity
  - Multimodal coaching advice and improvement guidance

### 5.4 Exercise Library
- Lists drill exercises and instruction details loaded from MongoDB
- Launches exercises with configurable difficulty (beginner, intermediate, advanced)
- Offers preset clinical sentences, custom passages, or AI-generated drill texts
- Evaluates drills via `POST /analyze/speech`, providing pronunciation alignment, pacing, and fluency feedback

## 6. Scientific Rationale Behind Evaluated Parameters
### 6.1 Pronunciation Accuracy
- Uses Word Error Rate (WER) via `jiwer`
- WER indicates pronunciation correctness relative to a target sentence
- Converts WER into a 0-10 accuracy score
- Useful for articulation drills and mismatch detection

### 6.2 Speech Rate (WPM)
- Ideal range targeted: 120–150 WPM
- Too slow may indicate hesitation and lack of fluency
- Too fast may indicate reduced clarity and cluttered speech
- Rate score encourages a conversational pace

### 6.3 Filler Words
- Fillers like `um`, `uh`, `like`, `actually`, `basically`, `so`, and `you know`
- Counted because they degrade fluency and listener comprehension
- Filler score penalizes overuse and encourages cleaner delivery

### 6.4 Stammering & Repetition
- Detects repeated syllable patterns: `w-w-what`, `c-c-cat`, and repeated words
- Repetition events indicate disfluency and articulation breakdowns
- Stammer score penalizes such patterns

### 6.5 Long Pauses
- Any gap > 1.5s between words is treated as a long pause
- Excessive silent gaps interrupt fluency and flow
- Pause score encourages smoother phrase connection

### 6.6 Clarity Score
- Derived from Whisper model confidence (`avg_logprob`)
- Higher confidence suggests better quality of speech capture and likely clearer pronunciation
- Included as a final combined metric for holistic fluency

### 6.7 Multimodal Visual Signals (Module 2)
- Eye contact indicates listener connection and confidence
- Smile ratio measures warmth and engagement
- Head and posture stability reflect composed physical presence

## 7. API Endpoints Summary
### Public / data APIs
- `GET /` — health check root
- `GET /practice/generate` — generate practice text, optionally exercise-specific
- `GET /exercises` — retrieve exercise drill metadata
- `GET /reports/{user_id}` — fetch streak and session history

### Auth APIs
- `POST /auth/register` — register user
- `POST /auth/login` — login user

### Module 1: Fluency & Speech Analysis APIs
- `POST /analyze/speech` — speech fluency and pronunciation analysis, scoring, and clinical recommendations
- `GET /tts/generate` — TTS reference audio playback (edge-tts / browser synthesis fallback)

### Module 2: Video & Communication Analysis APIs
- `POST /video/analyze` — submit video recording for asynchronous background analysis
- `GET /video/session/{job_id}` — poll job state and fetch multimodal report
- `GET /video/reports/{user_id}` — fetch past video communication reports
- `DELETE /video/session/{job_id}` — delete session recording
- `GET /video/health` — video analysis module health check

## 8. System Diagram (Textual)
```text
[Browser UI] -- HTTP --> [FastAPI Backend]
      |                    |-- Whisper transcription
      |                    |-- jiwer WER & word alignment
      |                    |-- filler/stammer/pause analysis
      |                    |-- MediaPipe FaceMesh & Pose (Module 2)
      |                    |-- AI text generation (Groq) if configured
      |                    |-- MongoDB persistence
      V                    |-- User auth token verification
  React + Recharts UI        V
      |                 [MongoDB Database]
      |-- exercises       |-- users
      |-- reports         |-- analysis_sessions
      |-- Module 1 audio  |-- video_analysis_jobs
      |-- Module 2 video  
```

## 9. How Everything Works End-to-End
1. User opens the app and the frontend loads exercises plus report history
2. User selects a module:
   - Module 1: Fluency Tracker (impromptu speaking, custom passage reading, pronunciation alignment, disfluency tracking)
   - Module 2: Video Analysis (multimodal facial expressions, eye contact, posture, and speech metrics)
   - Exercises: choose a drill and practice with beginner, intermediate, or advanced passages
3. Frontend sends media and metadata to backend
4. Backend processes audio/video, transcribes speech, computes metrics, stores session
5. Frontend displays scores, charts, timeline, and recommendations
6. User can repeat drills, view history, and self-monitor progress

## 10. Key Notes
- The system separates raw session intent from evaluation category using `session_category`
- History uses `session_category` for Module 1, Module 2, and Exercise tabs
- The backend currently returns the full session history, not only the last 10 records
- TTS support exists as an optional endpoint for voice playback
- AI text generation is optional and falls back to local templates if no API key is configured

## 11. Recommended Enhancements
- Add an explicit `session_type` field to fully distinguish exercise vs module data without inference
- Add pagination or lazy loading in history for large histories
- Add a dedicated exercise scoring path that can accumulate drill-specific metrics
- Add a visualization dashboard for weekly trends and progress goals

---

This document is a complete overview of the SpeechAI solution, including architecture, module flows, scoring rationale, tech stack, APIs, and system operation.