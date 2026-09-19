# AI-Based Real-Time Communication & Speech Therapy System
## (Indian English Focus) — Complete Implementation Plan

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                          │
│  - Mic capture (WebRTC / MediaRecorder API)                          │
│  - Practice UI (Module 1)   |   Live Analysis UI (Module 2)          │
│  - Score/Feedback dashboard, progress charts                         │
└───────────────────────────┬───────────────────────────────────────┘
                             │  Audio blob (webm/wav) + metadata (POST)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI, Python)                     │
│  /practice/submit   /analyze/speech   /reports/{user_id}   /auth/*   │
│                                                                        │
│  ┌───────────────┐   ┌───────────────────┐   ┌────────────────────┐ │
│  │ Audio Handler │→→│ Whisper (STT engine)│→→│ NLP + Feature       │ │
│  │ (librosa,     │   │ (transcript + word  │   │ Extraction Layer    │ │
│  │ ffmpeg)       │   │ timestamps)          │   │ (spaCy/regex/       │ │
│  └───────────────┘   └───────────────────┘   │ librosa signal proc)│ │
│                                                 └──────────┬─────────┘ │
│                                                            ▼           │
│                                              ┌─────────────────────┐  │
│                                              │  Scoring Engine      │  │
│                                              │  (rule-based, weighted│ │
│                                              │  formulas)            │ │
│                                              └──────────┬───────────┘  │
│                                                          ▼             │
│                                              ┌─────────────────────┐  │
│                                              │ Feedback & Therapy   │  │
│                                              │ Recommendation Engine│  │
│                                              └──────────┬───────────┘  │
└─────────────────────────────────────────────────────────┼───────────┘
                                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          MongoDB (Database)                          │
│   users | practice_sessions | analysis_sessions | reports | exercises│
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 How the Two Modules Interact

Both modules share the **same core pipeline** (audio → Whisper transcript → feature extraction), but diverge at the scoring stage:

- **Module 1 (Practice Trainer)** compares the transcript against a **known target sentence** → produces a *pronunciation/accuracy score*.
- **Module 2 (Detection Engine)** analyzes the transcript and raw audio **without a fixed target** → produces a *fluency/disfluency score* (stammering, fillers, pauses, rate, clarity).

They share:
- The same STT engine (Whisper) — run once, reused by both.
- The same MongoDB `users` collection and progress-tracking logic.
- The same `reports` schema (so a dashboard can show combined progress over time).

This means you build the **audio → transcript → features** pipeline once, and Module 1 vs Module 2 are just two different consumers of the same feature set (Module 1 additionally needs a reference sentence for diffing).

### 1.3 Data Flow (Step-by-Step)

1. User clicks record in React UI → `MediaRecorder` captures mic audio (webm/opus).
2. On stop, audio blob is POSTed as `multipart/form-data` to FastAPI (`/practice/submit` or `/analyze/speech`).
3. Backend saves the file temporarily, converts to 16kHz mono WAV via `ffmpeg` (Whisper requirement).
4. `librosa` loads the WAV for signal-level features (duration, silence segments, energy).
5. Whisper transcribes → returns text **+ word-level timestamps** (use `whisper-timestamped` or `faster-whisper` with word timestamps enabled — critical for pause/rate detection).
6. Feature extraction layer runs:
   - Text-level: filler word detection, stammer/repetition detection (via transcript + regex/n-gram comparison).
   - Audio-level: pause detection (silence gaps from timestamps), speech rate (words ÷ duration), confidence/clarity (Whisper's average log-prob per segment).
7. Scoring engine computes sub-scores → weighted final score (0–10).
8. Feedback engine maps low sub-scores → specific therapy exercises (rule-based lookup table).
9. Result JSON returned to frontend; also persisted to MongoDB (`analysis_sessions` / `practice_sessions`) for progress tracking.
10. Frontend renders scorecard + feedback + updates the progress chart (Recharts/Chart.js).

---

## 2. Technology Stack (and Why)

| Layer | Choice | Why it fits a 1–2 week timeline |
|---|---|---|
| **Frontend** | React + `MediaRecorder API` (not full WebRTC) | You don't need peer-to-peer real-time streaming — you need "record → upload → get result," which is a batch request, not a live stream. `MediaRecorder` is a few lines of code vs. days of WebRTC signaling/STUN/TURN setup. Save WebRTC for a "future work" section unless a professor explicitly wants live streaming. |
| **Live word feedback (Module 1)** | Browser **Web Speech API** (`SpeechRecognition`) | Module 1 is a Monkeytype-style live typing-test UX — the user needs instant word-by-word highlighting *while speaking*, not after a batch upload. Web Speech API streams interim results client-side with near-zero latency and zero backend cost. It's not used for scoring (accuracy is inconsistent, especially on accents) — only for the live visual cursor. Whisper still does the authoritative scoring afterward. Chrome/Edge only — note this as a known limitation. |
| **Backend** | FastAPI (Python) | Native fit for AI/ML — Whisper, librosa, spaCy are all Python. FastAPI gives you async request handling, automatic OpenAPI docs (useful for your report/demo), and Pydantic validation with almost no boilerplate. Avoids the friction of calling Python ML models from a Node backend. |
| **Speech-to-Text** | OpenAI **Whisper** (`small` or `base` model, or `faster-whisper` for speed) | Whisper is multilingual and was trained on a huge, diverse dataset that includes a meaningful amount of Indian-accented English, so it's noticeably more robust to Indian English than Google's or most commercial STT for out-of-the-box accuracy. It's free, runs locally (no API cost/quota risk during a demo), and gives word-level timestamps needed for pause/rate detection. |
| **Alt/optional model** | Wav2Vec2 (fine-tuned, e.g. `facebook/wav2vec2-large-960h` or an Indian-English fine-tune from HuggingFace) | Mention as an alternative/comparison in your report ("we evaluated Whisper vs Wav2Vec2") to show academic rigor — but use Whisper as your **actual production model** since it needs no fine-tuning and handles accents better out-of-the-box. Don't spend real time fine-tuning Wav2Vec2; that alone can eat your whole timeline. |
| **Audio processing** | `librosa` + `pydub`/`ffmpeg` | Format conversion, silence detection, duration/energy extraction. Well-documented, minimal setup. |
| **NLP** | `spaCy` (small model) or plain regex/n-gram logic | You don't need deep NLP — filler-word and stammer detection are pattern-matching problems, not semantic ones. spaCy's tokenizer is enough; skip heavier NLP unless you want to also flag grammar issues. |
| **Database** | MongoDB | Session/report data is naturally document-shaped (nested scores, timestamps, arrays of detected events) — avoids relational joins for what is essentially JSON blobs per session. Also fast to prototype with (no migrations). |
| **Deployment (optional)** | Render/Railway (backend) + Vercel (frontend) | Free tiers, fast to set up, matches your existing deployment experience. |

**Why NOT train your own model:** Training an ASR or disfluency-detection model from scratch requires large labeled datasets and GPU time you don't have in 1–2 weeks. Every "AI" component in this system should be either a **pre-trained model used as-is** (Whisper) or a **rule-based algorithm operating on model output** (fillers, stammering, pauses, scoring). This is a legitimate and common design pattern — be upfront about it in your report as an intentional engineering decision, not a shortcut you're hiding.

---

## 3. Working Flow

### 3.1 Module 1 — Speech Practice & Therapy Trainer (Monkeytype-style, live)

This module is a **live, real-time typing-test-style UX** — the user sees the target sentence and gets instant word-by-word visual feedback as they speak, not after a batch upload. This needs two parallel tracks: an instant client-side track for the live cursor, and an accurate backend track for the real score.

```
Target sentence displayed word-by-word (Monkeytype-style text block)
        │
        ▼
User clicks "Start Speaking" → TWO things start in parallel:
        │
        ├─→ TRACK A (live, client-side):
        │     Web Speech API (SpeechRecognition) streams interim
        │     results as the user talks
        │           │
        │           ▼
        │     Word-matcher compares next expected word vs latest
        │     recognized word → advances a cursor
        │           │
        │           ▼
        │     UI updates instantly:
        │       ✅ green = correct   ❌ red = mismatched   ▫️ gray = pending
        │     Live WPM counter ticks up as words are matched
        │
        └─→ TRACK B (accurate, backend):
              MediaRecorder simultaneously records the raw audio
              in the background (not shown to user)
        │
        ▼
Cursor reaches last word (or user clicks "Done") → recording stops
        │
        ▼
Recorded audio → sent to backend → Whisper transcribes → real
Word Error Rate (WER) + pronunciation_score computed
   - Word-level alignment (difflib / Levenshtein / jiwer library)
   - This backend score REPLACES the live Web Speech API guess
     as the score of record (Web Speech API was only for the
     live visual — it's not accurate enough to trust for scoring)
        │
        ▼
Final result screen shows the Whisper-based score + mismatched words
        │
        ▼
Store session → update daily progress streak
```

**Practical tips:**
- Use the `jiwer` Python library for WER calculation on the backend — one function call, no need to write edit-distance logic yourself.
- Client-side word matching only needs simple case-insensitive, punctuation-stripped string comparison against the next expected word — don't overbuild this part, it's cosmetic.
- Web Speech API's `SpeechRecognition` supports `interimResults = true` and `continuous = true` — that combination is what gives you the live-as-you-speak updates instead of waiting for a pause.
- Known limitation to document in your report: Web Speech API is Chrome/Edge only and requires an internet connection (Google's recognition service runs server-side even though the API feels local).

### 3.2 Module 2 — Speech Therapy Detection & Analysis Engine

```
Audio input (free speech, not compared to a target)
        │
        ▼
Whisper → transcript + word-level timestamps + per-segment confidence
        │
        ▼
┌─────────────── Feature Extraction (parallel) ───────────────┐
│                                                                │
│ Filler detection    → regex/dictionary match on transcript    │
│ (um, uh, like, you know, actually, basically...)               │
│                                                                │
│ Stammer detection   → look for immediate word/syllable         │
│                        repetition in transcript ("I-I-I want") │
│                        + very short-interval repeated segments │
│                        in timestamps                            │
│                                                                │
│ Pause detection     → gaps between consecutive word timestamps │
│                        > threshold (e.g. 1.5s) = hesitation     │
│                                                                │
│ Speech rate         → word_count / audio_duration_minutes = WPM│
│                                                                │
│ Clarity/confidence  → average Whisper log-probability per      │
│                        segment (low = mumbled/unclear speech)  │
│                                                                │
│ Mispronunciation    → (approximate) phonetic distance between  │
│                        Whisper's transcript and a dictionary    │
│                        pronunciation, OR compare against        │
│                        expected word list if context is known   │
└────────────────────────────────────────────────────────────────┘
        │
        ▼
Scoring Engine (Section 4)
        │
        ▼
Feedback Engine (Section 5)
        │
        ▼
Report saved + displayed
```

---

## 4. Scoring System (Detailed)

All sub-scores are normalized to **0–10**, where 10 = best (no disfluency) and 0 = worst.

### 4.1 Filler Score
```
filler_rate = filler_word_count / total_word_count
filler_score = 10 - min(filler_rate * 40, 10)
```
*(e.g., 5% filler rate → 10 - 2 = 8; 25%+ filler rate → 0)*

### 4.2 Stammer Score
```
stammer_events = count of detected repetition instances
stammer_rate = stammer_events / total_word_count
stammer_score = 10 - min(stammer_rate * 50, 10)
```

### 4.3 Pause Score
```
long_pauses = count of gaps > 1.5s between words
pause_rate = long_pauses / total_word_count
pause_score = 10 - min(pause_rate * 60, 10)
```
*(Weight pause_rate higher since even a few long pauses matter a lot.)*

### 4.4 Speech Rate Score
Ideal conversational English is ~120–150 WPM. Score penalizes deviation from this band:
```
if 120 <= WPM <= 150: rate_score = 10
elif WPM < 120: rate_score = 10 - ((120 - WPM) / 12)   # too slow
elif WPM > 150: rate_score = 10 - ((WPM - 150) / 15)   # too fast
rate_score = clamp(rate_score, 0, 10)
```

### 4.5 Clarity Score
Whisper gives an average log-probability per segment (roughly -1.0 to 0.0, closer to 0 = more confident).
```
avg_logprob = mean(segment.avg_logprob for segment in whisper_output)
clarity_score = clamp((avg_logprob + 1.0) * 10, 0, 10)
```

### 4.6 Final Weighted Score
```
final_score = (0.20 * filler_score)
            + (0.25 * stammer_score)
            + (0.20 * pause_score)
            + (0.20 * rate_score)
            + (0.15 * clarity_score)
```
Weights are configurable — document in your report that **stammering and pauses are weighted highest** since they're the primary clinical markers of stammering/dysfluency, while filler words and rate are secondary indicators.

Round `final_score` to 1 decimal, and bucket it for the UI:
- 8.0–10.0 → "Excellent Fluency"
- 6.0–7.9 → "Good, minor issues"
- 4.0–5.9 → "Needs Practice"
- Below 4.0 → "Significant Difficulty — recommend focused therapy exercises"

---

## 5. Feedback & Therapy Logic

Use a simple **rule-based lookup table**: for each sub-score below a threshold, append a specific piece of feedback and a suggested exercise. This is deterministic, explainable (good for a viva/demo), and requires zero ML.

| Condition | Feedback Message | Suggested Exercise |
|---|---|---|
| `filler_score < 6` | "You used filler words frequently (um, uh, like). Try pausing silently instead of filling gaps." | Silent-pause drill: read 5 sentences, replacing every urge to say "um" with a 1-second silent pause. |
| `stammer_score < 6` | "Repetition of sounds/words was detected — a common stammering pattern." | Slow-rate reading: read a paragraph at half your normal speed, elongating first sounds of words. |
| `pause_score < 6` | "Frequent long hesitations were detected between words." | Sentence-chunking practice: break sentences into 3–4 word phrases and practice fluent delivery phrase-by-phrase. |
| `rate_score < 6` (too fast) | "Your speech rate is faster than typical conversational pace, which can worsen clarity." | Metronome-paced reading at 130 WPM using a free online metronome app. |
| `rate_score < 6` (too slow) | "Your speech rate is slower than typical — this may indicate hesitation or over-caution." | Timed reading challenge: read a fixed passage and try to reach 120–140 WPM while staying clear. |
| `clarity_score < 6` | "Some words were unclear or mumbled." | Articulation drill: over-enunciate consonants in a tongue-twister set for 5 minutes daily. |

Combine all triggered feedback items into a **feedback list** (not just one message) so the report feels comprehensive. Keep a static `exercises` collection in MongoDB so the mapping is data-driven and easy to extend without redeploying code.

---

## 6. Backend Design

### 6.1 Core Endpoints

```
POST /auth/register
POST /auth/login                       → returns JWT

POST /practice/submit
  Request: multipart/form-data
    - audio: file
    - target_sentence: string
    - user_id: string (from JWT)
  Response:
    {
      "spoken_text": "I wnat to go home",
      "target_text": "I want to go home",
      "word_error_rate": 0.2,
      "pronunciation_score": 8.0,
      "mismatched_words": [{"expected": "want", "spoken": "wnat", "index": 1}],
      "session_id": "..."
    }

POST /analyze/speech
  Request: multipart/form-data
    - audio: file
    - user_id: string
  Response:
    {
      "transcript": "...",
      "duration_sec": 42.3,
      "word_count": 88,
      "wpm": 124.6,
      "filler_count": 6,
      "filler_words_found": ["um", "like", "uh"],
      "stammer_events": 2,
      "long_pauses": 3,
      "sub_scores": {
        "filler_score": 7.5,
        "stammer_score": 8.0,
        "pause_score": 7.0,
        "rate_score": 9.2,
        "clarity_score": 8.5
      },
      "final_score": 8.0,
      "feedback": [
        "You used filler words frequently...",
        "Frequent long hesitations were detected..."
      ],
      "recommended_exercises": ["silent_pause_drill", "sentence_chunking"],
      "session_id": "..."
    }

GET  /reports/{user_id}                → progress history, trend chart data
GET  /reports/{user_id}/session/{id}    → single session detail
GET  /exercises                        → list of all therapy exercises
```

### 6.2 Audio Processing Pipeline (inside `/analyze/speech`)

```python
# Pseudocode
audio_bytes = await file.read()
save_temp(audio_bytes, "input.webm")
wav_path = convert_to_wav("input.webm", sr=16000, mono=True)  # ffmpeg/pydub

whisper_result = whisper_model.transcribe(wav_path, word_timestamps=True)
transcript = whisper_result["text"]
segments = whisper_result["segments"]  # includes avg_logprob, word timestamps

features = extract_features(transcript, segments, wav_path)
scores = compute_scores(features)
feedback = generate_feedback(scores)

save_session_to_db(user_id, transcript, features, scores, feedback)
return response_json
```

---

## 7. Database Design (MongoDB)

### 7.1 Collections

**`users`**
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "password_hash": "string",
  "created_at": "datetime",
  "streak_count": 5,
  "last_practice_date": "date"
}
```

**`practice_sessions`** (Module 1)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "target_text": "string",
  "spoken_text": "string",
  "word_error_rate": 0.15,
  "pronunciation_score": 8.5,
  "mismatched_words": [ {"expected": "string", "spoken": "string", "index": 2} ],
  "audio_ref": "string (optional, if storing audio)",
  "created_at": "datetime"
}
```

**`analysis_sessions`** (Module 2)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "transcript": "string",
  "duration_sec": 42.3,
  "word_count": 88,
  "wpm": 124.6,
  "filler_count": 6,
  "stammer_events": 2,
  "long_pauses": 3,
  "sub_scores": {
    "filler_score": 7.5, "stammer_score": 8.0,
    "pause_score": 7.0, "rate_score": 9.2, "clarity_score": 8.5
  },
  "final_score": 8.0,
  "feedback": ["string", "string"],
  "recommended_exercise_ids": ["ex_01", "ex_04"],
  "created_at": "datetime"
}
```

**`exercises`**
```json
{
  "_id": "ex_01",
  "title": "Silent Pause Drill",
  "trigger_condition": "filler_score < 6",
  "description": "string",
  "difficulty": "beginner"
}
```

**`reports`** (aggregated, optional — can also be computed on-the-fly)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "week_start": "date",
  "avg_final_score": 7.2,
  "trend": "improving",
  "sessions_count": 12
}
```

### 7.2 Indexing
- Index `user_id` on `practice_sessions` and `analysis_sessions` (most queries filter by user).
- Index `created_at` (descending) for progress-over-time queries.

---

## 8. Datasets & Indian English Handling

- **No custom dataset is required for the MVP** — Whisper is pre-trained and used zero-shot.
- If you want to **evaluate/benchmark** accuracy on Indian English specifically (good for your report's "Results" section), use a small public sample from:
  - **Indic-TTS / OpenSLR Indian English corpora** (OpenSLR hosts several Indian-language and Indian-English speech datasets).
  - **Mozilla Common Voice** (has an Indian English accent-tagged subset).
- **Why Whisper handles Indian English reasonably well:** it was trained on a very large and diverse multilingual/multi-accent web-scraped audio corpus, which included substantial exposure to non-native and Indian-accented English, so it generalizes better out-of-the-box than models trained mostly on US/UK accent data.
- **Practical accuracy tips (no training required):**
  - Use the `small` or `medium` Whisper model (not `tiny`) — meaningfully better accuracy on accented speech at a manageable compute cost.
  - Prompt Whisper with an `initial_prompt` containing domain vocabulary (e.g., common practice sentences) to bias transcription toward expected words.
  - For filler-word detection, add Indian-English-specific fillers to your dictionary: "actually", "basically", "you know", "like", "so", in addition to "um"/"uh".
- **State clearly in your report:** you are not fine-tuning Whisper (time constraint), but you are configuring/prompting it and selecting model size deliberately to improve Indian-English performance — a legitimate and explainable engineering choice.

---

## 9. Implementation Plan (1–2 Weeks)

### Phase-wise Breakdown

**Days 1–2: Setup & Core Pipeline**
- Set up FastAPI project, MongoDB connection, React skeleton.
- Get mic recording working in React (`MediaRecorder`), upload to a test endpoint.
- Get Whisper running locally on a sample file; confirm word timestamps + avg_logprob are accessible.
- ✅ Milestone: audio in → transcript out, end-to-end.

**Days 3–4: Module 1 (Practice Trainer)**
- Build `/practice/submit` endpoint with WER calculation (`jiwer`).
- Build simple practice UI: show target sentence, record button, show diff/score.
- Save sessions to MongoDB; build a basic streak counter.
- ✅ Milestone: Module 1 fully working end-to-end.

**Days 5–7: Module 2 (Detection Engine) — Core**
- Implement filler detection (dictionary + regex).
- Implement pause detection from word timestamps.
- Implement speech rate (WPM) calculation.
- Implement clarity score from Whisper's avg_logprob.
- Wire up the weighted scoring formula.
- ✅ Milestone: `/analyze/speech` returns all sub-scores.

**Days 8–9: Stammer Detection + Feedback Engine**
- Implement repetition detection (n-gram/consecutive duplicate word/syllable check on transcript).
- Build the feedback rule table + `exercises` collection.
- Connect scores → feedback → recommended exercises.
- ✅ Milestone: full report JSON generated from raw audio.

**Days 10–11: Frontend Polish + Dashboard**
- Build results/report UI (scorecards, feedback list, exercise suggestions).
- Build progress dashboard (Recharts line chart of `final_score` over time).
- Auth (JWT login/register) if not already integrated.

**Days 12–13: Testing, Edge Cases, Deployment**
- Test with multiple speakers/accents; tune thresholds (pause length, filler list).
- Handle edge cases: silent audio, very short recordings, no speech detected.
- Deploy backend (Railway/Render) + frontend (Vercel); test CORS.

**Day 14: Buffer + Documentation**
- Buffer day for bugs.
- Write up architecture diagrams, screenshots, and the report using this document as the base.

> If you only have **1 week**, cut to: Days 1–2 (setup), 3–4 (Module 1), 5–6 (Module 2 core scoring only, skip stammer detection or make it very simple), 7 (polish + deploy). Drop dashboard/streak features first if time runs short — they're not core to the AI functionality.

---

## 10. Design Decisions — What NOT to Build

To stay realistic for 1–2 weeks, explicitly **do not** attempt:

- ❌ **Training/fine-tuning any model** (ASR, disfluency classifier, accent classifier) — use pre-trained Whisper as-is.
- ❌ **True WebRTC live streaming** — batch record-then-upload is far simpler and sufficient for a demo; mention live streaming as future work.
- ❌ **Deep learning-based stammer/filler detection** — rule-based regex/pattern matching on the transcript + timestamp gaps is explainable, fast to build, and academically defensible as a first version.
- ❌ **True phoneme-level pronunciation scoring** (needs a forced-aligner like Montreal Forced Aligner + phoneme dictionaries) — approximate via word-level text diff (WER) instead; mention phoneme-level scoring as a future enhancement.
- ❌ **Multi-user real-time concurrency handling** — a single-request-at-a-time FastAPI setup is fine for a project demo; don't over-engineer for scale.
- ❌ **Custom Indian-English accent dataset collection** — use existing public datasets only if you have time for an evaluation section; don't build a data collection pipeline.

**Simplifications to explicitly state in your report:**
- Mispronunciation detection is **approximate** (text-level mismatch via Whisper transcript vs. expected word), not true acoustic-phonetic analysis.
- Stammering detection is based on **transcript-level repetition patterns**, not clinical audio biomarkers — a reasonable proxy, not a clinical diagnostic tool.
- All scoring formulas are **rule-based and weighted**, tunable via configuration — not learned from data. This is intentional given the project timeline and is a standard MVP approach.

---

## 11. Final Output Format (Sample)

### Sample Module 2 Report (as shown to the user)

```
🎙️ Speech Analysis Report
Duration: 45 seconds | Word Count: 92 | Speech Rate: 122 WPM

┌─────────────────────────────┐
│ Overall Fluency Score: 7.2/10 │
│ Status: Good, minor issues     │
└─────────────────────────────┘

Sub-Scores:
  Filler Words     ██████████████░░░░░░  7.0/10  (4 fillers: "um", "like")
  Stammering       ████████████████░░░░  8.0/10  (1 repetition detected)
  Pauses           ██████████░░░░░░░░░░  5.5/10  (3 long pauses > 1.5s)
  Speech Rate       ████████████████████  9.5/10  (122 WPM — ideal range)
  Clarity          ██████████████░░░░░░  7.0/10

📋 Feedback:
  • Frequent long hesitations were detected between words.
  • You used filler words a few times (um, like) — minor, but worth noting.

💡 Recommended Exercises:
  1. Sentence-Chunking Practice (targets: pauses)
  2. Silent-Pause Drill (targets: fillers)

📈 Progress: Your fluency score has improved from 6.5 → 7.2 over your last 5 sessions.
```

### Sample Module 1 Report

```
🗣️ Pronunciation Practice Result

Target:  "I want to go home now"
You said: "I wnat to go home now"

Pronunciation Score: 8.5/10
Word Error Rate: 11%

Word-by-word:
  I ✅  want ❌ (heard: "wnat")  to ✅  go ✅  home ✅  now ✅

🔥 Streak: 6 days
```

---

## Summary

This architecture deliberately keeps every AI component **pre-trained-model + rule-based-logic**, which is the correct engineering choice for a 1–2 week build — it's fast, explainable in a viva, and produces a genuinely working end-to-end system rather than a half-finished ML training pipeline. The two modules share one audio → Whisper → feature-extraction pipeline, diverging only at the scoring stage, which keeps the codebase lean and lets you build once, use twice.
