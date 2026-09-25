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
- Backend stores users, sessions, and exercises in MongoDB
- Whisper model is loaded lazily on the backend and reused across requests
- Backend analytics use both exact metrics (WER, pauses, speed) and derived scores
- UI presents:
  - Dashboard metrics and history
  - Module 1 Practice session flow
  - Module 2 Fluency analysis flow
  - Exercise drill library and guided practice

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
  - `exercise_id` (optional)
- Behavior:
  - If API key present, calls Groq AI via OpenAI-like chat completions
  - Otherwise returns local fallback templates
- Purpose:
  - Generate practice prompts or passages tailored to either free practice or drill exercises

### 3.3 Practice Submission (Module 1)
- Route: `POST /practice/submit`
- Inputs:
  - `audio`
  - `target_sentence`
  - optional `exercise_id`, `exercise_title`
- Flow:
  1. Receive recording and store temp file
  2. Convert to WAV via `audio_utils.convert_to_wav`
  3. Transcribe with Whisper
  4. Clean both target and spoken text
  5. Compute WER via `jiwer`
  6. Score pronunciation as `max(0, min(10, round((1 - wer) * 10, 1)))`
  7. Align words and collect mismatches
  8. Persist session to MongoDB under `practice_sessions`
  9. Return structured pronunciation feedback and streak count

### 3.4 Fluency Analysis (Module 2)
- Route: `POST /analyze/speech`
- Inputs:
  - `audio`
  - optional `target_sentence`
  - optional `exercise_id`, `exercise_title`
- Features evaluated:
  - duration (`duration_sec`)
  - word count
  - speech rate (`wpm`)
  - filler word count and specific filler types
  - stammer/repetition count
  - long pause detection and pause timeline
  - clarity score derived from average log probability of Whisper segments
- Scoring engine weights:
  - filler score: 20%
  - stammer score: 25%
  - pause score: 20%
  - rate score: 20%
  - clarity score: 15%
- Score calculation:
  - filler score: `10 - (filler_rate * COEFF_FILLER)`
  - stammer score: `10 - (stammer_rate * COEFF_STAMMER)`
  - pause score: `10 - (pause_rate * COEFF_PAUSE)`
  - rate score: perfect if 120-150 WPM, otherwise penalized based on distance from target band
  - clarity score: normalized from Whisper segment logprob
- Persisted in `analysis_sessions`
- Feedback includes recommended drills and optional AI pathologist commentary

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
  - line charts for practice and fluency progress
  - history timeline tabs for practice, analysis, exercise
- History is grouped by `session_category`
  - `practice`
  - `analysis`
  - `exercise`

### 5.2 Practice Module
- Uses browser microphone to record audio
- Uses either the user-entered target or AI-generated practice passage
- Sends audio to `POST /practice/submit`
- Displays: pronunciation score, WER, mismatched words, streak updates
- Supports exercise drill targets when active exercise selected

### 5.3 Fluency Module
- Records live audio
- Sends to `POST /analyze/speech`
- Displays: fluency score, wpm, filler count, stammer events, long pauses, clarity
- Also shows dynamic visual timeline of pause segments and AI feedback

### 5.4 Exercise Library
- Lists drill exercises and instruction details
- Launches an exercise and optionally generates text specific to drill intent
- Evaluates using either practice or analysis route depending on drill type

## 6. Scientific Rationale Behind Evaluated Parameters
### 6.1 Pronunciation Accuracy
- Uses Word Error Rate (WER)
- WER indicates pronunciation correctness relative to a target sentence
- Converts WER into a 0-10 accuracy score
- Useful for articulation practice and mismatch detection

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

## 7. API Endpoints Summary
### Public / data APIs
- `GET /` — health check root
- `GET /practice/generate` — generate practice text, optionally exercise-specific
- `GET /exercises` — retrieve exercise drill metadata
- `GET /reports/{user_id}` — fetch streak and session history

### Auth APIs
- `POST /auth/register` — register user
- `POST /auth/login` — login user

### Analysis APIs
- `POST /practice/submit` — practice pronunciation submission and scoring
- `POST /analyze/speech` — fluency analysis, scoring, and feedback
- `GET /tts/generate` — TTS generation (Edge TTS based; optional backend feature)

## 8. System Diagram (Textual)
```text
[Browser UI] -- HTTP --> [FastAPI Backend]
      |                    |-- Whisper transcription
      |                    |-- jiwer WER scoring
      |                    |-- filler/stammer/pause analysis
      |                    |-- AI text generation (Groq) if API key configured
      |                    |-- MongoDB persistence
      V                    |-- User auth token verification
  React + Recharts UI        V
      |                 [MongoDB Database]
      |-- exercises       |-- users
      |-- reports         |-- practice_sessions
      |-- practice submit |-- analysis_sessions
      |-- analyze speech  
```

## 9. How Everything Works End-to-End
1. User opens the app and the frontend loads exercises plus report history
2. User selects a module:
   - Practice: record audio and compare against target text
   - Fluency: record audio and analyze pace, filler, stammer, pauses
   - Exercises: choose a drill and either practice or analyze depending on drill type
3. Frontend sends audio and metadata to backend
4. Backend processes audio, transcribes speech, computes metrics, stores session
5. Frontend displays scores, charts, timeline, and recommendations
6. User can repeat practice, view history, and self-monitor progress

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