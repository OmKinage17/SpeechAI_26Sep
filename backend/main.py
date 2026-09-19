import os
import shutil
import uuid
import logging
import re
import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import whisper
import jiwer

from audio_utils import convert_to_wav
import httpx
from fastapi.responses import StreamingResponse
import asyncio

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SpeechAI_Backend")

app = FastAPI(title="SpeechAI API", description="AI-Based Speech Therapy & Fluency System API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Module 3 Integration
from video_module.router import router as video_router, init_router as init_video_router
app.include_router(video_router)

# Temporary directory for file processing
TEMP_DIR = "temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

# MongoDB Setup
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
try:
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = mongo_client["speechai_db"]
    mongo_client.server_info()
    logger.info("Successfully connected to MongoDB.")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    db = None

# Whisper Model Initialization (Lazy Loading)
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        logger.info("Loading Whisper 'base' model...")
        whisper_model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully.")
    return whisper_model

# ==========================================
# GLOBAL CONFIGURATION CONSTANTS
# ==========================================
WEIGHT_FILLER = 0.20
WEIGHT_STAMMER = 0.25
WEIGHT_PAUSE = 0.20
WEIGHT_RATE = 0.20
WEIGHT_CLARITY = 0.15

COEFF_FILLER = 40.0
COEFF_STAMMER = 50.0
COEFF_PAUSE = 60.0

PAUSE_THRESHOLD_SEC = 1.5
IDEAL_WPM_MIN = 120.0
IDEAL_WPM_MAX = 150.0

SECRET_KEY = "speechai_cryptographic_secret_key_salt_token"
# ==========================================

# ==========================================
# CRYPTOGRAPHIC AUTHENTICATION HELPERS
# ==========================================
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}:{pwd_hash}"

def verify_password(password: str, stored_password: str) -> bool:
    try:
        salt, pwd_hash = stored_password.split(":")
        test_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return secrets.compare_digest(pwd_hash, test_hash)
    except Exception:
        return False

def generate_token(user_id: str) -> str:
    timestamp = str(int(datetime.utcnow().timestamp()))
    message = f"{user_id}:{timestamp}"
    sig = hmac.new(SECRET_KEY.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{user_id}:{timestamp}:{sig}"

def verify_token(token: str) -> Optional[str]:
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        user_id, timestamp, sig = parts[0], parts[1], parts[2]
        
        token_time = float(timestamp)
        current_time = datetime.utcnow().timestamp()
        # Token valid for 7 days
        if current_time - token_time > 7 * 86400:
            return None
            
        message = f"{user_id}:{timestamp}"
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()
        if secrets.compare_digest(sig, expected_sig):
            return user_id
        return None
    except Exception:
        return None

def get_user_id_from_header(authorization: Optional[str]) -> str:
    if not authorization:
        return "user_anonymous"
    try:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            user_id = verify_token(token)
            if user_id:
                return user_id
    except Exception:
        pass
    return "user_anonymous"

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ==========================================
# CORE UTILITY FUNCTIONS
# ==========================================
def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def serialize_datetime(dt: datetime) -> str:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')
    return dt.isoformat().replace('+00:00', 'Z')

def detect_fillers(transcript: str) -> tuple[int, List[str]]:
    text_lower = transcript.lower()
    filler_count = 0
    fillers_found = []

    phrase_fillers = ["you know"]
    remaining_text = text_lower
    for phrase in phrase_fillers:
        pattern = rf'\b{phrase}\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_count += len(matches)
            fillers_found.append(phrase)
            remaining_text = re.sub(pattern, ' ', remaining_text)

    single_word_fillers = ["um", "uh", "like", "actually", "basically", "so"]
    cleaned_remaining = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?]', ' ', remaining_text)
    words = cleaned_remaining.split()
    for w in words:
        if w in single_word_fillers:
            filler_count += 1
            if w not in fillers_found:
                fillers_found.append(w)

    return filler_count, fillers_found

def detect_stammering(transcript: str) -> int:
    text_lower = transcript.lower()
    stammer_events = 0

    reps_3 = re.findall(r'\b([a-zA-Z]{1,3})-\1-\1\b', text_lower)
    cleaned_text_reps_3_removed = re.sub(r'\b([a-zA-Z]{1,3})-\1-\1\b', ' ', text_lower)
    reps_2 = re.findall(r'\b([a-zA-Z]{1,3})-\1\b', cleaned_text_reps_3_removed)
    
    stammer_events += len(reps_3) + len(reps_2)

    cleaned_words = clean_text(text_lower).split()
    word_repetitions = 0
    for i in range(len(cleaned_words) - 1):
        if cleaned_words[i] == cleaned_words[i+1]:
            word_repetitions += 1

    stammer_events += word_repetitions
    return stammer_events

def evaluate_condition(condition: str, context: dict) -> bool:
    try:
        sub_conditions = [s.strip() for s in condition.split('and')]
        for sub_cond in sub_conditions:
            parts = sub_cond.split()
            if len(parts) == 3:
                var_name, op, val_str = parts[0], parts[1], parts[2]
                if var_name in context:
                    val = float(val_str)
                    actual_val = context[var_name]
                    
                    if op == "<":
                        if not (actual_val < val): return False
                    elif op == ">":
                        if not (actual_val > val): return False
                    elif op == "<=":
                        if not (actual_val <= val): return False
                    elif op == ">=":
                        if not (actual_val >= val): return False
                    elif op == "==":
                        if not (actual_val == val): return False
                    else:
                        return False
                else:
                    return False
            else:
                return False
        return True
    except Exception as e:
        logger.error(f"Error evaluating condition '{condition}': {e}")
        return False

def seed_exercises():
    if db is None:
        return
    exercises_collection = db["exercises"]
    
    if exercises_collection.count_documents({"feedback_message": {"$exists": True}}) == 0:
        logger.info("Exercises missing feedback messages. Migrating exercises...")
        exercises_collection.drop()
        
        default_exercises = [
            {
                "_id": "silent_pause_drill",
                "title": "Silent Pause Drill",
                "trigger_condition": "filler_score < 6.0",
                "feedback_message": "You used filler words frequently (um, uh, like, you know). Try pausing silently instead of filling gaps.",
                "description": "Read 5 sentences aloud. Replace every urge to say 'um' or 'uh' with a 1-second silent pause.",
                "difficulty": "beginner"
            },
            {
                "_id": "slow_rate_reading",
                "title": "Slow-Rate Reading",
                "trigger_condition": "stammer_score < 6.0",
                "feedback_message": "Repetition of sounds/syllables was detected — a common stammering pattern.",
                "description": "Read a paragraph at half your normal speed, elongating the first sound of each word.",
                "difficulty": "beginner"
            },
            {
                "_id": "sentence_chunking",
                "title": "Sentence-Chunking Practice",
                "trigger_condition": "pause_score < 6.0",
                "feedback_message": "Frequent long hesitations were detected between words.",
                "description": "Break sentences into 3-4 word phrases and practice delivering them phrase-by-phrase with brief pauses.",
                "difficulty": "intermediate"
            },
            {
                "_id": "metronome_paced_reading",
                "title": "Metronome-Paced Reading",
                "trigger_condition": "wpm > 150.0",
                "feedback_message": "Your speech rate is faster than typical conversational pace, which can worsen clarity.",
                "description": "Practice reading a passage to the beat of a metronome set at 120-130 WPM.",
                "difficulty": "intermediate"
            },
            {
                "_id": "timed_reading_challenge",
                "title": "Timed Reading Challenge",
                "trigger_condition": "wpm < 120.0",
                "feedback_message": "Your speech rate is slower than typical — this may indicate hesitation or over-caution.",
                "description": "Read a 150-word passage and try to finish it within exactly 60-70 seconds.",
                "difficulty": "intermediate"
            },
            {
                "_id": "articulation_drill",
                "title": "Articulation Drill",
                "trigger_condition": "clarity_score < 6.0",
                "feedback_message": "Some words were unclear or mumbled. Try articulating consonants more firmly.",
                "description": "Over-enunciate consonants in a set of selected tongue-twisters for 5 minutes daily.",
                "difficulty": "beginner"
            },
            {
                "_id": "advanced_impromptu_speaking",
                "title": "Advanced Impromptu Speaking",
                "trigger_condition": "filler_score >= 6.0 and stammer_score >= 6.0 and pause_score >= 6.0 and clarity_score >= 6.0 and wpm >= 120.0 and wpm <= 150.0",
                "feedback_message": "Excellent fluency! Your pace, pause usage, and articulation are in the optimal range.",
                "description": "Speak impromptu on a random topic for 2 minutes maintaining this excellent flow.",
                "difficulty": "advanced"
            }
        ]
        exercises_collection.insert_many(default_exercises)
        logger.info("Successfully seeded and migrated exercises.")
    else:
        logger.info("Exercises exist and match schema. Skipping seed.")

def seed_default_user():
    if db is None:
        return
    users_collection = db["users"]
    if users_collection.count_documents({"_id": "user_anonymous"}) == 0:
        logger.info("Initializing default anonymous user...")
        users_collection.insert_one({
            "_id": "user_anonymous",
            "name": "Guest User",
            "email": "anonymous@speechai.com",
            "streak_count": 0,
            "last_practice_date": None,
            "created_at": datetime.utcnow()
        })
        logger.info("Default anonymous user initialized.")

def update_user_streak(user_id: str) -> int:
    if db is None:
        return 0
    
    users_collection = db["users"]
    user = users_collection.find_one({"_id": user_id})
    if not user:
        users_collection.insert_one({
            "_id": user_id,
            "name": "Registered User",
            "email": f"{user_id}@speechai.com",
            "streak_count": 1,
            "last_practice_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "created_at": datetime.utcnow()
        })
        return 1

    current_date_str = datetime.utcnow().strftime("%Y-%m-%d")
    last_practice_str = user.get("last_practice_date")
    streak_count = user.get("streak_count", 0)

    if not last_practice_str:
        streak_count = 1
    elif last_practice_str == current_date_str:
        pass
    else:
        last_date = datetime.strptime(last_practice_str, "%Y-%m-%d")
        current_date = datetime.strptime(current_date_str, "%Y-%m-%d")
        delta = (current_date - last_date).days

        if delta == 1:
            streak_count += 1
        else:
            streak_count = 1

    users_collection.update_one(
        {"_id": user_id},
        {
            "$set": {
                "streak_count": streak_count,
                "last_practice_date": current_date_str
            }
        }
    )
    return streak_count

@app.on_event("startup")
def startup_db_client():
    try:
        seed_exercises()
        seed_default_user()
        init_video_router(db, get_whisper_model)
    except Exception as e:
        logger.error(f"Error during database seeding: {e}")

# ==========================================
# AUTH ENDPOINTS
# ==========================================
@app.post("/auth/register")
def register_user(req: RegisterRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    users_collection = db["users"]
    
    # Check if email already exists
    if users_collection.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(req.password)
    
    try:
        users_collection.insert_one({
            "_id": user_id,
            "name": req.name,
            "email": req.email,
            "password_hash": hashed_pwd,
            "streak_count": 0,
            "last_practice_date": None,
            "created_at": datetime.utcnow()
        })
        logger.info(f"User '{req.email}' successfully registered.")
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        logger.error(f"Failed to register user: {e}")
        raise HTTPException(status_code=500, detail="Failed to register user")

@app.post("/auth/login")
def login_user(req: LoginRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    users_collection = db["users"]
    user = users_collection.find_one({"email": req.email})
    
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    user_id = user["_id"]
    token = generate_token(user_id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"]
        }
    }

# ==========================================
# API ENDPOINTS
# ==========================================
@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "SpeechAI API",
        "timestamp": datetime.utcnow().isoformat(),
        "database_connected": db is not None
    }

@app.get("/practice/generate")
async def generate_practice_text(
    topic: Optional[str] = "General Communication",
    length: Optional[str] = "paragraph",
    exercise_id: Optional[str] = "none"
):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    focus_guidelines = ""
    if exercise_id and exercise_id != "none":
        try:
            ex = db["exercises"].find_one({"_id": exercise_id})
            if ex:
                focus_guidelines = f" Focus on the requirements of the exercise '{ex['title']}': {ex['description']}."
        except Exception as e:
            logger.error(f"Error fetching exercise context: {e}")

    length_desc = "one single sentence of about 10-15 words"
    if length == "paragraph":
        length_desc = "one paragraph of about 40-60 words"
    elif length == "long_paragraph":
        length_desc = "one extended paragraph or two of about 100-150 words"

    api_key = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")
    if api_key:
        is_groq = api_key.startswith("gsk_")
        endpoint = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.x.ai/v1/chat/completions"
        model = "llama-3.3-70b-versatile" if is_groq else "grok-beta"
        source_name = "Groq Cloud" if is_groq else "Grok AI"

        logger.info(f"Querying {source_name} to generate practice text for topic={topic}, length={length}, exercise={exercise_id}...")
        prompt = (
            f"You are a helpful speech therapist assistant. Generate a speech practice text "
            f"about the topic '{topic}'. The text must be exactly {length_desc}.{focus_guidelines} "
            f"Ensure the text is natural, engaging, and contains vocabulary relevant to the topic. "
            f"Do not include any intro, outro, titles, quotes, markdown formatting, or metadata. Output ONLY the raw text to be read aloud."
        )
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are a professional speech therapist assistant. Output raw practice text only."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    generated_text = data["choices"][0]["message"]["content"].strip()
                    if generated_text.startswith('"') and generated_text.endswith('"'):
                        generated_text = generated_text[1:-1]
                    logger.info(f"Successfully generated text via {source_name} API.")
                    return {"text": generated_text, "source": source_name}
                else:
                    logger.error(f"{source_name} API returned error status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to fetch from {source_name}: {e}")

    logger.info("Using local template generator fallback.")
    fallback_templates = {
        "sentence": [
            "We should discuss the importance of communication in space exploration.",
            "Cooking requires patience, fresh ingredients, and a good understanding of recipes.",
            "Technology continues to evolve rapidly, transforming the way we connect with others.",
            "Professional success is built on active listening and concise speech articulation.",
            "Learning a new language is a beautiful journey that enriches the human mind."
        ],
        "paragraph": [
            "Speaking in front of an audience can be intimidating at first, but with steady pacing and deliberate breaths, anyone can deliver a powerful message. It is essential to focus on articulation and maintain a conversational speed of around one hundred and thirty words per minute, avoiding filler words.",
            "The culinary arts offer a wonderful blend of creativity and science. Whether you are baking bread or slow-cooking a savory soup, each step requires attention to detail. Sharing a warm meal with family and friends is one of the oldest and most universal ways of expressing care.",
            "Human exploration of outer space has inspired generations of scientists, writers, and dreamers. Sending satellites into orbit and landing rovers on Mars helps us answer fundamental questions about our solar system. The journey to the stars is a testament to human curiosity and innovation."
        ],
        "long_paragraph": [
            "To speak clearly and confidently, one must practice the art of breath control and deliberate pacing. A common mistake is rushing through sentences, which leads to slurred consonants and frequent stammering. By breaking your speech into logical chunks and pausing silently for a brief moment between key ideas, you give the listener time to absorb your thoughts. Daily drills focusing on challenging tongue-twisters and steady reading exercises will significantly boost your overall articulation, clarity, and voice resonance over time.",
            "Modern digital technology plays an indispensable role in shaping our daily routines, from remote work platforms to automated smart home devices. While these advancements offer incredible convenience and boost global productivity, they also challenge us to find a healthy balance between online interactions and face-to-face communication. As artificial intelligence and machine learning models continue to mature, the key focus remains on leveraging technology ethically to solve real-world problems and improve lives."
        ]
    }

    selected_list = fallback_templates.get(length, fallback_templates["sentence"])
    
    matched = [t for t in selected_list if topic.lower() in t.lower()]
    import random
    text = random.choice(matched) if matched else random.choice(selected_list)
    
    if exercise_id == "articulation_drill":
        text += " She sells seashells by the seashore, and the seashells she sells are surely seashells."

    return {"text": text, "source": "local_fallback"}

@app.get("/exercises")
def get_exercises():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    try:
        exercises = list(db["exercises"].find({}))
        for ex in exercises:
            ex["id"] = str(ex["_id"])
        return exercises
    except Exception as e:
        logger.error(f"Error fetching exercises: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/{user_id}")
def get_user_reports(user_id: str, authorization: Optional[str] = Header(None)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Overwrite user_id if token is valid
    auth_user_id = get_user_id_from_header(authorization)
    target_user_id = auth_user_id if auth_user_id != "user_anonymous" else user_id

    try:
        practice_cursor = db["practice_sessions"].find({"user_id": target_user_id}).sort("created_at", -1)
        practice_sessions = list(practice_cursor)
        for s in practice_sessions:
            s["_id"] = str(s["_id"])
            s["type"] = s.get("session_category", "practice")
            s["created_at"] = serialize_datetime(s["created_at"]) if isinstance(s["created_at"], datetime) else s["created_at"]

        analysis_cursor = db["analysis_sessions"].find({"user_id": target_user_id}).sort("created_at", -1)
        analysis_sessions = list(analysis_cursor)
        for s in analysis_sessions:
            s["_id"] = str(s["_id"])
            s["type"] = s.get("session_category", "analysis")
            s["created_at"] = serialize_datetime(s["created_at"]) if isinstance(s["created_at"], datetime) else s["created_at"]

        combined = practice_sessions + analysis_sessions
        combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        user_record = db["users"].find_one({"_id": target_user_id})
        streak = user_record.get("streak_count", 0) if user_record else 0

        return {
            "streak_count": streak,
            "sessions": combined
        }
    except Exception as e:
        logger.error(f"Error fetching user reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def align_words(target_words: List[str], spoken_words: List[str]) -> List[Dict[str, Any]]:
    """
    Performs dynamic programming sequence alignment (Levenshtein Edit Distance) 
    between target_words and spoken_words to map expected vs. actual spoken tokens.
    """
    n, m = len(target_words), len(spoken_words)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
        
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if target_words[i-1] == spoken_words[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = min(
                    dp[i-1][j] + 1,    # Omission
                    dp[i][j-1] + 1,    # Insertion
                    dp[i-1][j-1] + 1   # Substitution
                )
                
    i, j = n, m
    alignment_map = {}
    
    while i > 0 or j > 0:
        if i > 0 and j > 0 and target_words[i-1] == spoken_words[j-1]:
            alignment_map[i-1] = spoken_words[j-1]
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            alignment_map[i-1] = spoken_words[j-1]
            i -= 1
            j -= 1
        elif i > 0 and (j == 0 or dp[i][j] == dp[i-1][j] + 1):
            alignment_map[i-1] = ""
            i -= 1
        else:
            j -= 1

    mismatched = []
    for idx, expected in enumerate(target_words):
        spoken_val = alignment_map.get(idx, "")
        if expected != spoken_val:
            mismatched.append({
                "expected": expected,
                "spoken": spoken_val,
                "index": idx
            })
    return mismatched

@app.post("/practice/submit")
async def submit_practice(
    audio: UploadFile = File(...),
    target_sentence: str = Form(...),
    exercise_id: Optional[str] = Form(None),
    exercise_title: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """
    Module 1: Practice Trainer Endpoint
    """
    user_id = get_user_id_from_header(authorization)
    logger.info(f"Received practice submission for user '{user_id}' with target sentence: '{target_sentence}' and exercise_id: '{exercise_id}'")

    session_id = str(uuid.uuid4())
    temp_raw_path = os.path.join(TEMP_DIR, f"{session_id}_{audio.filename}")
    temp_wav_path = os.path.join(TEMP_DIR, f"{session_id}_converted.wav")

    try:
        with open(temp_raw_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        if not convert_to_wav(temp_raw_path, temp_wav_path):
            raise HTTPException(status_code=500, detail="Audio conversion failed")

        model = get_whisper_model()
        result = model.transcribe(temp_wav_path, word_timestamps=True)
        spoken_text = result.get("text", "").strip()

        target_clean = clean_text(target_sentence)
        spoken_clean = clean_text(spoken_text)

        wer_val = 1.0
        if target_clean:
            try:
                wer_val = jiwer.wer(target_clean, spoken_clean)
            except Exception as e:
                logger.error(f"Error computing WER: {e}")
                wer_val = 1.0

        pron_score = max(0.0, min(10.0, round((1.0 - wer_val) * 10, 1)))

        target_words = target_clean.split()
        spoken_words = spoken_clean.split()
        
        mismatched_words = align_words(target_words, spoken_words)

        streak_count = update_user_streak(user_id)

        response_data = {
            "session_id": session_id,
            "spoken_text": spoken_text,
            "target_text": target_sentence,
            "word_error_rate": float(wer_val),
            "pronunciation_score": float(pron_score),
            "mismatched_words": mismatched_words,
            "exercise_id": exercise_id,
            "exercise_title": exercise_title,
            "streak_count": streak_count
        }

        if db is not None:
            try:
                db["practice_sessions"].insert_one({
                    **response_data,
                    "user_id": user_id,
                    "session_category": "exercise" if exercise_id else "practice",
                    "created_at": datetime.utcnow()
                })
                logger.info(f"Practice session '{session_id}' persisted to DB.")
            except Exception as e:
                logger.error(f"Failed to save practice session to MongoDB: {e}")

        return response_data

    except Exception as e:
        logger.error(f"Error processing practice submission: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in (temp_raw_path, temp_wav_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file '{path}': {e}")

@app.post("/analyze/speech")
async def analyze_speech(
    audio: UploadFile = File(...),
    target_sentence: Optional[str] = Form(None),
    exercise_id: Optional[str] = Form(None),
    exercise_title: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """
    Module 2: Speech Fluency Tracker Endpoint
    """
    user_id = get_user_id_from_header(authorization)
    logger.info(f"Received speech analysis request for user '{user_id}' with exercise_id: '{exercise_id}'")

    session_id = str(uuid.uuid4())
    temp_raw_path = os.path.join(TEMP_DIR, f"{session_id}_{audio.filename}")
    temp_wav_path = os.path.join(TEMP_DIR, f"{session_id}_converted.wav")

    try:
        with open(temp_raw_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        if not convert_to_wav(temp_raw_path, temp_wav_path):
            raise HTTPException(status_code=500, detail="Audio conversion failed")

        model = get_whisper_model()
        result = model.transcribe(temp_wav_path, word_timestamps=True)
        transcript = result.get("text", "").strip()
        segments = result.get("segments", [])

        target_clean = ""
        wer_val = None
        mismatched_words = []
        
        if target_sentence:
            target_clean = clean_text(target_sentence)
            spoken_clean = clean_text(transcript)
            if target_clean:
                try:
                    wer_val = jiwer.wer(target_clean, spoken_clean)
                    mismatched_words = align_words(target_clean.split(), spoken_clean.split())
                except Exception as e:
                    logger.error(f"Error computing WER in fluency analysis: {e}")

        # 1. Feature Extraction: Duration
        duration_sec = 0.0
        if segments:
            duration_sec = segments[-1].get("end", 0.0) - segments[0].get("start", 0.0)
        if duration_sec <= 0.0:
            duration_sec = 1.0

        # 2. Feature Extraction: Word Count
        words_list = []
        for segment in segments:
            if "words" in segment:
                words_list.extend(segment["words"])
        
        total_word_count = len(words_list)
        if total_word_count == 0:
            total_word_count = len(transcript.split())

        # 3. Feature Extraction: Speech Rate (WPM)
        duration_min = duration_sec / 60.0
        wpm = round(total_word_count / duration_min, 1) if duration_min > 0 else 0.0

        # 4. Feature Extraction: Filler Words
        filler_count, filler_words_found = detect_fillers(transcript)

        # 5. Feature Extraction: Stammering
        stammer_events = detect_stammering(transcript)

        # 6. Feature Extraction: Long Pauses
        long_pauses = 0
        pause_details = []
        if len(words_list) > 1:
            for i in range(len(words_list) - 1):
                curr_end = words_list[i].get("end", 0.0)
                next_start = words_list[i+1].get("start", 0.0)
                gap = next_start - curr_end
                if gap > PAUSE_THRESHOLD_SEC:
                    long_pauses += 1
                    pause_details.append({
                        "start": round(curr_end, 1),
                        "end": round(next_start, 1),
                        "duration": round(gap, 1)
                    })

        # 7. Clarity Score
        avg_logprob = 0.0
        if segments:
            avg_logprob = sum(seg.get("avg_logprob", 0.0) for seg in segments) / len(segments)
        clarity_score = max(0.0, min(10.0, round((avg_logprob + 1.0) * 10, 1)))

        # --- SCORING ENGINE ---
        filler_rate = filler_count / max(1, total_word_count)
        filler_score = max(0.0, min(10.0, round(10.0 - (filler_rate * COEFF_FILLER), 1)))

        stammer_rate = stammer_events / max(1, total_word_count)
        stammer_score = max(0.0, min(10.0, round(10.0 - (stammer_rate * COEFF_STAMMER), 1)))

        pause_rate = long_pauses / max(1, total_word_count)
        pause_score = max(0.0, min(10.0, round(10.0 - (pause_rate * COEFF_PAUSE), 1)))

        if IDEAL_WPM_MIN <= wpm <= IDEAL_WPM_MAX:
            rate_score = 10.0
        elif wpm < IDEAL_WPM_MIN:
            rate_score = max(0.0, round(10.0 - ((IDEAL_WPM_MIN - wpm) / 12), 1))
        else:
            rate_score = max(0.0, round(10.0 - ((wpm - IDEAL_WPM_MAX) / 15), 1))

        final_score = round(
            (WEIGHT_FILLER * filler_score) +
            (WEIGHT_STAMMER * stammer_score) +
            (WEIGHT_PAUSE * pause_score) +
            (WEIGHT_RATE * rate_score) +
            (WEIGHT_CLARITY * clarity_score),
            1
        )

        # --- DATA-DRIVEN FEEDBACK & RECOMMENDATIONS ENGINE ---
        feedback = []
        recommended_exercises = []

        context = {
            "filler_score": filler_score,
            "stammer_score": stammer_score,
            "pause_score": pause_score,
            "clarity_score": clarity_score,
            "wpm": wpm
        }

        db_exercises = []
        if db is not None:
            try:
                db_exercises = list(db["exercises"].find({}))
            except Exception as e:
                logger.error(f"Failed to fetch exercises for evaluation: {e}")

        for ex in db_exercises:
            condition = ex.get("trigger_condition", "")
            if condition:
                if evaluate_condition(condition, context):
                    fb_msg = ex.get("feedback_message", "")
                    if fb_msg:
                        feedback.append(fb_msg)
                    recommended_exercises.append(ex.get("_id"))

        if not feedback:
            feedback.append("Excellent fluency! Your pace, pause usage, and articulation are in the optimal range.")
            recommended_exercises.append("advanced_impromptu_speaking")

        # AI Speech Pathologist Personalized Evaluation
        ai_pathologist_feedback = ""
        api_key = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")
        if api_key:
            is_groq = api_key.startswith("gsk_")
            endpoint = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.x.ai/v1/chat/completions"
            model = "llama-3.3-70b-versatile" if is_groq else "grok-beta"
            source_name = "Groq Cloud" if is_groq else "Grok AI"

            logger.info("Querying AI for personalized speech pathologist evaluation...")
            prompt = (
                "You are an expert speech-language pathologist. Review this speech session statistics:\n"
                f"Spoken text: \"{transcript}\"\n"
                f"Speed: {wpm} WPM\n"
                f"Filler words used: {filler_count} ({', '.join(filler_words_found) if filler_words_found else 'none'})\n"
                f"Hesitations/stammers: {stammer_events} instances\n"
                f"Gaps of silence: {long_pauses} pauses\n\n"
                "Write a warm, professional, encouraging, and highly specific 3-sentence evaluation report. "
                "Highlight one key strength and one actionable speaking tip based on their transcript and pace. "
                "Address the user directly. Do not include greetings, introductions, headings, or quotes."
            )
            
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        endpoint,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": "You are a professional speech pathologist writer. Write exactly three sentences of encouraging feedback directly addressing the speaker."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.7
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        ai_pathologist_feedback = data["choices"][0]["message"]["content"].strip()
                        if ai_pathologist_feedback.startswith('"') and ai_pathologist_feedback.endswith('"'):
                            ai_pathologist_feedback = ai_pathologist_feedback[1:-1]
                        logger.info("Successfully fetched AI Speech Pathologist feedback.")
                    else:
                        logger.error(f"Failed to fetch AI feedback (status {response.status_code}): {response.text}")
            except Exception as e:
                logger.error(f"Error calling LLM for pathologist feedback: {e}")

        if not ai_pathologist_feedback:
            # Fallback evaluation
            ai_pathologist_feedback = (
                f"Your speech rate of {wpm} WPM demonstrates steady pacing. "
                f"To build confidence, focus on reducing filler words and elongating key vowel sounds. "
                f"Continue practicing structured exercises to master control over silent pauses."
            )

        streak_count = update_user_streak(user_id)

        response_data = {
            "session_id": session_id,
            "transcript": transcript,
            "duration_sec": float(duration_sec),
            "word_count": int(total_word_count),
            "wpm": float(wpm),
            "filler_count": int(filler_count),
            "filler_words_found": filler_words_found,
            "stammer_events": int(stammer_events),
            "long_pauses": int(long_pauses),
            "pause_details": pause_details,
            "sub_scores": {
                "filler_score": float(filler_score),
                "stammer_score": float(stammer_score),
                "pause_score": float(pause_score),
                "rate_score": float(rate_score),
                "clarity_score": float(clarity_score)
            },
            "final_score": float(final_score),
            "feedback": feedback,
            "recommended_exercises": recommended_exercises,
            "ai_pathologist_feedback": ai_pathologist_feedback,
            "target_text": target_sentence,
            "word_error_rate": float(wer_val) if wer_val is not None else None,
            "mismatched_words": mismatched_words,
            "exercise_id": exercise_id,
            "exercise_title": exercise_title,
            "streak_count": streak_count
        }

        if db is not None:
            try:
                db["analysis_sessions"].insert_one({
                    **response_data,
                    "user_id": user_id,
                    "session_category": "exercise" if exercise_id else "analysis",
                    "created_at": datetime.utcnow()
                })
                logger.info(f"Speech analysis session '{session_id}' persisted to DB.")
            except Exception as e:
                logger.error(f"Failed to save speech analysis session to MongoDB: {e}")

        return response_data

    except Exception as e:
        logger.error(f"Error processing speech analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for path in (temp_raw_path, temp_wav_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file '{path}': {e}")


@app.get('/tts/generate')
async def generate_tts(text: Optional[str] = None, voice: Optional[str] = 'en-US-AriaNeural'):
    """Synthesize text to speech using edge-tts and stream as MP3.

    Example: GET /tts/generate?text=Hello+world
    """
    if not text:
        raise HTTPException(status_code=400, detail='Missing text parameter')

    try:
        import edge_tts
    except Exception as e:
        logger.error(f'edge-tts is not available: {e}')
        raise HTTPException(status_code=500, detail='TTS engine not available on server')

    async def audio_stream():
        communicate = edge_tts.Communicate(text, voice=voice)
        try:
            async for msg in communicate.stream():
                if msg.get('type') == 'audio':
                    # msg['data'] contains raw bytes
                    yield msg.get('data')
        except Exception as e:
            logger.error(f'Error during TTS streaming: {e}')

    return StreamingResponse(audio_stream(), media_type='audio/mpeg')
