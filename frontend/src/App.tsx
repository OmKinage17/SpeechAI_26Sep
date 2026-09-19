import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, CheckCircle, AlertCircle, Sparkles, BookOpen, BarChart3, HelpCircle, Activity, Flame, History, AlertTriangle, LogIn, LogOut, UserPlus, X, Search, RefreshCw, LayoutDashboard, Compass, Volume2, Video as VideoIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import './App.css';
import { VideoAnalysisModule } from './modules/video/VideoAnalysisModule';

// Type definitions
interface MismatchedWord {
  expected: string;
  spoken: string;
  index: number;
}

interface PracticeResult {
  spoken_text: string;
  target_text: string;
  word_error_rate: number;
  pronunciation_score: number;
  mismatched_words: MismatchedWord[];
  streak_count?: number;
}

interface PauseDetail {
  start: number;
  end: number;
  duration: number;
}

interface AnalysisResult {
  transcript: string;
  duration_sec: number;
  word_count: number;
  wpm: number;
  filler_count: number;
  filler_words_found: string[];
  stammer_events: number;
  long_pauses: number;
  pause_details?: PauseDetail[];
  sub_scores: {
    filler_score: number;
    stammer_score: number;
    pause_score: number;
    rate_score: number;
    clarity_score: number;
  };
  final_score: number;
  feedback: string[];
  recommended_exercises: string[];
  target_text?: string;
  word_error_rate?: number;
  mismatched_words?: MismatchedWord[];
  ai_pathologist_feedback?: string;
  streak_count?: number;
}

interface Exercise {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  trigger_condition: string;
}

interface SessionRecord {
  session_id: string;
  type: 'practice' | 'analysis' | 'exercise';
  session_category?: 'practice' | 'analysis' | 'exercise';
  created_at: string;
  spoken_text?: string;
  target_text?: string;
  transcript?: string;
  exercise_id?: string;
  exercise_title?: string;
  pronunciation_score?: number;
  final_score?: number;
  wpm?: number;
  filler_count?: number;
  filler_words_found?: string[];
  stammer_events?: number;
  long_pauses?: number;
  duration_sec?: number;
  pause_details?: PauseDetail[];
  mismatched_words?: MismatchedWord[];
  word_error_rate?: number;
  sub_scores?: {
    filler_score: number;
    stammer_score: number;
    pause_score: number;
    rate_score: number;
    clarity_score: number;
  };
  feedback?: string[];
  recommended_exercises?: string[];
  ai_pathologist_feedback?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const SAMPLE_SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "Practice makes a man perfect, especially in language skills.",
  "Clear communication is essential for professional success.",
  "Indian English speakers often have a unique and expressive rhythm.",
  "She sells seashells by the seashore, and the shells she sells are surely seashells.",
  "Peter Piper picked a peck of pickled peppers; did Peter Piper pick a peck of pickled peppers?",
  "Rhythm and timing are crucial when delivering a public speech to a large audience.",
  "A steady breathing pattern helps reduce stammering and speech blocks during conversation.",
  "Innovations in artificial intelligence are rapidly shaping our global communication systems.",
  "The beautiful blue butterfly fluttered gracefully over the bright yellow blossoms in the garden."
];

const TOPIC_PROMPTS = [
  "Explain what you had for breakfast today, or talk about a recent movie you watched.",
  "Describe your favorite hobby and why you enjoy spending time on it.",
  "Talk about a memorable vacation trip you took with your friends or family.",
  "Discuss your favorite book or film and what values it taught you.",
  "Explain the steps to make a simple dish or coffee.",
  "Describe what your dream job is and the skills needed to achieve it."
];

const EXERCISE_INSTRUCTION_MAP: Record<string, { objective: string; howToPerform: string[]; advantages: string[] }> = {
  silent_pause_drill: {
    objective: "Train your brain to replace involuntary vocal fillers (like 'um', 'uh', 'like', 'you know') with a clean, confident silent pause.",
    howToPerform: [
      "Scan the target text before speaking to get familiar with the sentence flow.",
      "As you start reading aloud, pay attention to moments where you hesitate or feel the urge to say a filler word.",
      "Instead of letting 'um' or 'uh' slip out, swallow, close your mouth, and pause silently for 1 second.",
      "Maintain comfortable posture, take a relaxed breath, and proceed to the next word."
    ],
    advantages: [
      "Significantly reduces auditory speech clutter, instantly sounding more professional.",
      "Gives your listener natural gaps to digest your message.",
      "Provides your brain with a cognitive breathing window to plan the next sentence."
    ]
  },
  slow_rate_reading: {
    objective: "Help prevent phoneme blocks and syllable repetitions by introducing prolonged vowel transitions and structured pacing.",
    howToPerform: [
      "Read the provided passage at roughly 50% of your normal speed.",
      "Slightly elongate the initial consonant or vowel of each word (e.g. 'S-s-peaking...').",
      "Connect words in a smooth, sliding tone rather than voicing them in sharp, staccato intervals.",
      "Keep your abdominal breathing steady and continuous throughout the sentence."
    ],
    advantages: [
      "Lowers tension in the vocal cords and articulatory muscles.",
      "Prevents physical sound blocks and repetitive stammers.",
      "Promotes a calm, meditative state during verbal output."
    ]
  },
  sentence_chunking: {
    objective: "Break complex sentences into digestible, rhythmic word groups to maintain vocal stamina and flow.",
    howToPerform: [
      "Look at the text and identify natural separators (commas, periods, conjunctions).",
      "Chunk your speech into brief, logical phrase groups of 3 to 5 words.",
      "Read each chunk with continuous phrasing, then insert a distinct 1.5-second silent pause.",
      "Inhale gently during each pause to keep your lungs filled with air."
    ],
    advantages: [
      "Prevents running out of breath before finishing long sentences.",
      "Improves vocal projection and listener comprehension.",
      "Establishes a structured, engaging cadence of delivery."
    ]
  },
  metronome_paced_reading: {
    objective: "Tackle rapid speaking speeds and speech cluttering by synchronizing syllables with a steady rhythmic pulse.",
    howToPerform: [
      "Focus on the visual tempo guide or count beats in your head.",
      "Articulate precisely one word or syllable per rhythmic interval.",
      "Do not rush ahead; force yourself to wait for the next beat before vocalizing.",
      "Slow down and over-emphasize word endings (like -ed, -s, -ing)."
    ],
    advantages: [
      "Overcomes conversational cluttering (running words together).",
      "Enforces a safe upper-limit speed threshold (ideally 120-140 WPM).",
      "Improves overall clarity and clarity scores."
    ]
  },
  timed_reading_challenge: {
    objective: "Help overcome over-cautious, hyper-hesitant speech styles by pacing your delivery against a target time window.",
    howToPerform: [
      "Review the text to ensure you know the pronunciation of all words.",
      "Start reading in a steady, conversational voice without back-tracking or self-correcting.",
      "Avoid extra pauses; read forward smoothly to finish within the target duration.",
      "Let mistakes go immediately rather than stopping to fix them."
    ],
    advantages: [
      "Combats excessive self-correction and hesitation blocks.",
      "Builds a natural, fluent, conversational rhythm.",
      "Boosts confidence in real-time, forward-moving speech."
    ]
  },
  articulation_drill: {
    objective: "Strengthen physical speech muscles and eliminate mumbling by exaggerating difficult consonant sounds.",
    howToPerform: [
      "Review the target tongue twister carefully.",
      "Exaggerate your lip, jaw, and tongue movements slightly as you speak.",
      "Deliver Plosive consonants (P, T, K, B, D, G) with crisp, firm air releases.",
      "Practice at a slower pace first to ensure every syllable is cleanly separated, then increase speed."
    ],
    advantages: [
      "Exercises and builds agility in speech muscles (articulators).",
      "Prevents mumbling and running syllables together.",
      "Ensures clear communication in noisy or professional settings."
    ]
  },
  advanced_impromptu_speaking: {
    objective: "Synthesize all positive speech habits (pacing, clear articulation, silent pauses) during spontaneous conversation.",
    howToPerform: [
      "Read the randomly selected prompt.",
      "Take 5-10 seconds to form a brief mental outline (Intro, Main Point, Summary).",
      "Start speaking freely without a script.",
      "Focus on slow pacing, breathing between thoughts, and absolute avoidance of filler words."
    ],
    advantages: [
      "Simulates real-world, high-pressure conversational speaking.",
      "Improves cognitive load management during speech.",
      "Consolidates and validates your progression toward fluent speech."
    ]
  }
};
const EXERCISE_LEVEL_PRESETS: Record<string, { beginner: string[]; intermediate: string[]; advanced: string[] }> = {
  silent_pause_drill: {
    beginner: [
      "Practice makes perfect.",
      "Speak slowly and clearly.",
      "Take a breath now."
    ],
    intermediate: [
      "Practice makes a man perfect, especially in language skills.",
      "A calm mind helps you coordinate words and speak without panic.",
      "Taking a brief silent pause between phrases lets you control your cadence."
    ],
    advanced: [
      "Deliberate pacing is not just about slow speed, but rather about incorporating natural, structured silences to allow your breathing to align with your thoughts.",
      "While speaking in public, pauses serve as a cognitive bridge, allowing both the speaker to plan the next sentence and the audience to digest the message.",
      "Establishing a steady verbal cadence requires continuous self-awareness, deep diaphragmatic inhalations, and the elimination of rapid speech spurts."
    ]
  },
  slow_rate_reading: {
    beginner: [
      "Keep a steady pace.",
      "Breathe in and out.",
      "Rushing causes blocks."
    ],
    intermediate: [
      "A steady breathing pattern helps reduce stammering and speech blocks during conversation.",
      "Slow, deliberate speech increases clarity and makes you sound professional.",
      "Slowing your word rate gives you time to anticipate and prevent sound repetitions."
    ],
    advanced: [
      "Vocal cord tension can be significantly minimized by consciously slowing down your speech rate to roughly one hundred and twenty words per minute.",
      "Speaking at a reduced velocity provides your brain with a safe buffer zone, allowing you to bypass physical blocks and speech repetitions.",
      "A controlled verbal delivery, combined with a relaxed physical posture, represents the foundation of speech therapy pacing techniques."
    ]
  },
  sentence_chunking: {
    beginner: [
      "Read short phrase groups.",
      "Pause after each chunk.",
      "Inhale during the pause."
    ],
    intermediate: [
      "To speak clearly and confidently, one must divide long sentences into chunks.",
      "Chunking complex sentences helps you maintain breath support throughout your speech.",
      "Insert a brief pause after logical word groups to establish a clean rhythm."
    ],
    advanced: [
      "Breaking your speech flow into logical phrase units of three to five words prevents vocal exhaustion and builds conversational stamina.",
      "By deliberately stopping at commas, conjunctions, and logical transition points, you create a rhythmic delivery that enhances listener comprehension.",
      "Diaphragmatic breathing during these structural pauses ensures your lungs are always filled, avoiding the gasping blocks typical of cluttered speech."
    ]
  },
  metronome_paced_reading: {
    beginner: [
      "One beat per word.",
      "Speak on the pulse.",
      "Wait for the beat."
    ],
    intermediate: [
      "Rhythm and timing are crucial when delivering a public speech to a large audience.",
      "Synchronize your syllables with the steady beat to regulate conversational speed.",
      "Force yourself to pause and wait for the next metronome pulse before speaking."
    ],
    advanced: [
      "Pacing your verbal output against an external rhythmic metronome pulse prevents the rapid syllable acceleration common in cluttering disorders.",
      "By matching the articulation of each word to a visual or auditory tempo guide, you enforce a safe speed threshold of under one hundred and thirty WPM.",
      "Exaggerating word endings and giving every vowel its full duration on the beat trains your articulators for consistent daily clarity."
    ]
  },
  timed_reading_challenge: {
    beginner: [
      "Read forward smoothly.",
      "Do not look back.",
      "Finish on time."
    ],
    intermediate: [
      "Clear communication is essential for professional success across global systems.",
      "Maintaining forward momentum is the key to conquering hyper-hesitant speech styles.",
      "Read the passage from start to finish without pausing to self-correct slips."
    ],
    advanced: [
      "To overcome excessive self-correction and speech block hesitations, you must train yourself to move forward continuously, regardless of minor errors.",
      "Pacing your reading against a strict target time window teaches you to maintain a steady vocal energy and bypass conversational blockades.",
      "Focusing on the final word of the paragraph rather than individual syllables helps build a smooth, uninterrupted conversational flow."
    ]
  },
  articulation_drill: {
    beginner: [
      "Red leather, yellow leather.",
      "Crisp consonants sound clear.",
      "Focus on word endings."
    ],
    intermediate: [
      "Peter Piper picked a peck of pickled peppers; did Peter Piper pick a peck of pickled peppers?",
      "She sells seashells by the seashore; the shells she sells are surely seashells.",
      "A big black bug bit a big black bear and made the big black bear bleed blood."
    ],
    advanced: [
      "Exaggerating your jaw, tongue, and lip placements when pronouncing hard plosive consonants ensures maximum intelligibility in professional settings.",
      "Crisp articulation of word endings, especially hard 't', 'd', and 'k' sounds, prevents mumbling and makes your speech sound polished and authoritative.",
      "Practice shifting your pitch and volume while maintaining crisp consonant separation to build control over your vocal articulators."
    ]
  },
  advanced_impromptu_speaking: {
    beginner: [
      "Talk about your favorite food.",
      "Describe your bedroom layout.",
      "What did you do yesterday?"
    ],
    intermediate: [
      "Explain what you had for breakfast today and how you prepared it.",
      "Describe a recent movie you watched and why you liked or disliked it.",
      "Talk about a memorable vacation trip you took and what you enjoyed most."
    ],
    advanced: [
      "Discuss your views on the future of artificial intelligence in modern healthcare and global education systems.",
      "Explain the key factors that contribute to career satisfaction and how you balance professional growth with personal life.",
      "Analyze the impact of social media platforms on adolescent mental health and suggest potential mitigation strategies."
    ]
  }
};

const getPresetsForExercise = (exerciseId: string, difficulty: 'beginner' | 'intermediate' | 'advanced'): string[] => {
  const levelPresets = EXERCISE_LEVEL_PRESETS[exerciseId];
  if (levelPresets) {
    return levelPresets[difficulty];
  }
  return [
    "Practice makes a man perfect, especially in language skills.",
    "A steady breathing pattern helps reduce stammering and speech blocks.",
    "Rhythm and timing are crucial when delivering a public speech."
  ];
};

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'practice' | 'fluency' | 'exercises' | 'video'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'video' || tab === 'practice' || tab === 'fluency' || tab === 'exercises' || tab === 'dashboard') {
      return tab;
    }
    return 'dashboard';
  });
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to record');
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentAudioType, setCurrentAudioType] = useState<'reference' | 'recording' | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Module 1 specific
  const [targetSentence, setTargetSentence] = useState(SAMPLE_SENTENCES[0]);
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);
  
  // Module 2 specific
  const [promptIndex, setPromptIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Persistence / DB state
  const [streakCount, setStreakCount] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  
  // Swappable history tab & detailed expander state
  const [historyTab, setHistoryTab] = useState<'practice' | 'analysis' | 'exercise'>('practice');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Grok AI practice text generator states
  const [aiTopic, setAiTopic] = useState('General Communication');
  const [aiLength, setAiLength] = useState('paragraph');
  const [aiFocusExercise, setAiFocusExercise] = useState('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fluencyTargetText, setFluencyTargetText] = useState('');
  const [configTabM1, setConfigTabM1] = useState<'presets' | 'custom' | 'grok'>('presets');
  const [configTabM2, setConfigTabM2] = useState<'prompt' | 'grok'>('prompt');

  // Exercise detail modal/instructions view state
  const [activeExerciseDetail, setActiveExerciseDetail] = useState<Exercise | null>(null);
  const [exerciseTargetText, setExerciseTargetText] = useState('');
  const [configTabExM1, setConfigTabExM1] = useState<'presets' | 'custom' | 'grok'>('presets');
  const [exerciseDifficulty, setExerciseDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const startExerciseDrill = (ex: Exercise) => {
    setActiveExerciseDetail(ex);
    
    // Set default difficulty based on exercise metadata
    const diff = (ex.difficulty === 'beginner' || ex.difficulty === 'intermediate' || ex.difficulty === 'advanced') ? ex.difficulty : 'beginner';
    setExerciseDifficulty(diff);
    
    const defaultPresets = getPresetsForExercise(ex._id, diff);
    setExerciseTargetText(defaultPresets[0] || "Read this target passage out loud to practice and track your speech parameters.");

    // Reset settings config tab
    setConfigTabExM1('presets');

    // Reset past results/playback states to prevent leak
    setPracticeResult(null);
    setAnalysisResult(null);
    setAudioUrl(null);
    setStatus('idle');
    setStatusMessage('Ready to record');
    setLiveTranscript('');
  };

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Live Browser STT state
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Initialize data on mount
  useEffect(() => {
    // Check for cached user session
    const cachedUser = localStorage.getItem('speechai_user');
    const cachedToken = localStorage.getItem('speechai_token');
    
    if (cachedUser && cachedToken) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch (e) {
        localStorage.removeItem('speechai_user');
        localStorage.removeItem('speechai_token');
      }
    }

    fetchExercises();

    // Setup speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      
      rec.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }
        setLiveTranscript((finalTrans + interimTrans).trim());
      };
      recognitionRef.current = rec;
    }
  }, []);

  // Fetch reports when user shifts (logged in vs anonymous)
  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    const userId = currentUser ? currentUser.id : 'user_anonymous';
    const token = localStorage.getItem('speechai_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/reports/${userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStreakCount(data.streak_count);
        const normalizedSessions = data.sessions.map((session: any) => {
          const hasExerciseMeta = session.session_category === 'exercise' || (session.exercise_id && session.exercise_id !== 'none') || !!session.exercise_title;
          const inferredType = session.type
            || (session.session_category === 'exercise' ? 'exercise'
              : session.session_category === 'analysis' ? 'analysis'
              : session.session_category === 'practice' ? 'practice'
              : hasExerciseMeta ? 'exercise'
              : 'practice');
          return {
            ...session,
            type: inferredType,
          };
        });
        setSessionHistory(normalizedSessions);

        const availableTypes = new Set(normalizedSessions.map((session: any) => session.type));
        if (!availableTypes.has(historyTab)) {
          if (availableTypes.has('practice')) setHistoryTab('practice');
          else if (availableTypes.has('analysis')) setHistoryTab('analysis');
          else if (availableTypes.has('exercise')) setHistoryTab('exercise');
        }
      }
    } catch (e) {
      console.error("Error fetching reports:", e);
    }
  };

  const fetchExercises = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/exercises');
      if (res.ok) {
        const data = await res.json();
        setExercisesList(data);
      }
    } catch (e) {
      console.error("Error fetching exercises:", e);
    }
  };

  const handleGenerateText = async () => {
    setIsGenerating(true);
    try {
      const url = `http://127.0.0.1:8000/practice/generate?topic=${encodeURIComponent(aiTopic)}&length=${aiLength}&exercise_id=${aiFocusExercise}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'practice') {
          setTargetSentence(data.text);
          setPracticeResult(null);
        } else {
          setFluencyTargetText(data.text);
          setAnalysisResult(null);
        }
        alert(`Practice text generated successfully using ${data.source}!`);
      } else {
        throw new Error("Failed to generate text");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating text. Falling back to default sentence.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExerciseText = async (exerciseId: string) => {
    setIsGenerating(true);
    try {
      const url = `http://127.0.0.1:8000/practice/generate?topic=${encodeURIComponent(aiTopic)}&length=${aiLength}&exercise_id=${exerciseId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExerciseTargetText(data.text);
        setPracticeResult(null);
        setAnalysisResult(null);
        alert(`Practice text generated successfully using ${data.source}!`);
      } else {
        throw new Error("Failed to generate text");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating text. Falling back to default sentence.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const url = authMode === 'login' 
      ? 'http://127.0.0.1:8000/auth/login' 
      : 'http://127.0.0.1:8000/auth/register';
      
    const payload = authMode === 'login'
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (authMode === 'login') {
        localStorage.setItem('speechai_token', data.access_token);
        localStorage.setItem('speechai_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        
        confetti({
          particleCount: 80,
          spread: 60,
          colors: ['#6366f1', '#a855f7']
        });
      } else {
        alert("Registration successful! Please sign in using your credentials.");
        setAuthMode('login');
        setAuthName('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('speechai_token');
    localStorage.removeItem('speechai_user');
    setCurrentUser(null);
    setStreakCount(0);
    setSessionHistory([]);
  };

  const startRecording = async () => {
    try {
      setLiveTranscript('');
      setAudioUrl(null);
      setPracticeResult(null);
      setAnalysisResult(null);
      audioBlobRef.current = null;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        audioBlobRef.current = audioBlob;
        setAudioUrl(URL.createObjectURL(audioBlob));
        submitAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
      setStatusMessage('Listening...');
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("SpeechRecognition error:", e);
        }
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      setStatus('error');
      setStatusMessage('Microphone access denied or not found.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("SpeechRecognition stop error:", e);
        }
      }
    }
  };

  const submitAudio = async (blob: Blob) => {
    setStatus('processing');
    setStatusMessage('Transcribing & analyzing speech...');
    
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    
    // Determine if the task is practice (pronunciation correction) type
    const isPracticeType = activeTab === 'practice' || (
      activeTab === 'exercises' && activeExerciseDetail && 
      ["silent_pause_drill", "slow_rate_reading", "articulation_drill"].includes(activeExerciseDetail._id)
    );
    
    let url = 'http://127.0.0.1:8000/analyze/speech';
    if (isPracticeType) {
      url = 'http://127.0.0.1:8000/practice/submit';
      const text = activeTab === 'exercises' ? exerciseTargetText : targetSentence;
      formData.append('target_sentence', text);
      if (activeTab === 'exercises' && activeExerciseDetail) {
        formData.append('exercise_id', activeExerciseDetail._id);
        formData.append('exercise_title', activeExerciseDetail.title);
      }
    } else {
      const text = activeTab === 'exercises' ? exerciseTargetText : fluencyTargetText;
      if (text) {
        formData.append('target_sentence', text);
      }
      if (activeTab === 'exercises' && activeExerciseDetail) {
        formData.append('exercise_id', activeExerciseDetail._id);
        formData.append('exercise_title', activeExerciseDetail.title);
      }
    }

    const token = localStorage.getItem('speechai_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (isPracticeType) {
        setPracticeResult(data);
        if (data.pronunciation_score >= 80 || (data.pronunciation_score >= 8 && data.pronunciation_score <= 10)) {
          confetti({
            particleCount: 120,
            spread: 80,
            colors: ['#6366f1', '#a855f7', '#10b981'],
            origin: { y: 0.6 }
          });
        }
      } else {
        setAnalysisResult(data);
      }
      
      if (data.streak_count !== undefined) {
        setStreakCount(data.streak_count);
      }
      fetchDashboardData();
      
      setStatus('success');
      setStatusMessage('Analysis complete!');
    } catch (err: any) {
      console.error("Network or Backend error:", err);
      setStatus('error');
      setStatusMessage(`Error: ${err.message || 'Could not connect to backend server.'}`);
    }
  };

  const renderWordDiff = () => {
    if (!practiceResult) return null;
    
    const targetWords = targetSentence.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/);
    const mismatchedIndices = new Set(practiceResult.mismatched_words.map(w => w.index));
    
    const handlePlayWord = (w: string) => {
      speakText(w);
    };

    return (
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {targetWords.map((word, index) => {
            let className = "practice-word";
            if (mismatchedIndices.has(index)) {
              className += " incorrect";
            } else {
              className += " correct";
            }
            return (
              <span key={index} className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {word}
                {mismatchedIndices.has(index) && (
                  <button 
                    onClick={() => handlePlayWord(targetWords[index])}
                    className="tts-word-play"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      marginLeft: '2px',
                      color: 'var(--error)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '4px'
                    }}
                    title={`Hear correct pronunciation: ${word}`}
                  >
                    <Volume2 size={12} />
                  </button>
                )}{' '}
              </span>
            );
          })}
        </div>

        <div className="tts-controls" style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <button 
            className="tts-btn" 
            onClick={() => isAudioPlaying && currentAudioType === 'reference' ? stopPlayback() : speakText(targetSentence)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            {isAudioPlaying && currentAudioType === 'reference' ? (
              <Square size={14} style={{ color: 'var(--error)' }} />
            ) : (
              <Volume2 size={14} style={{ color: 'var(--primary)' }} />
            )}
            {isAudioPlaying && currentAudioType === 'reference' ? 'Stop' : 'Listen Reference'}
          </button>
          {audioUrl && (
            <button 
              className="tts-btn" 
              onClick={() => playUserRecording()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                padding: '6px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              {isAudioPlaying && currentAudioType === 'recording' ? (
                <Square size={14} style={{ color: 'var(--error)' }} />
              ) : (
                <Play size={14} style={{ color: 'var(--success)' }} />
              )}
              {isAudioPlaying && currentAudioType === 'recording' ? 'Stop' : 'Play My Recording'}
            </button>
          )}
        </div>
      </div>
    );
  };


  const getLiveWordColorClass = (_targetWord: string, index: number): string => {
    if (!liveTranscript) {
      return index === 0 ? 'practice-word current' : 'practice-word default';
    }

    const currentTarget = activeTab === 'practice'
      ? targetSentence
      : (activeTab === 'exercises' ? exerciseTargetText : fluencyTargetText);
    const targetWords = currentTarget.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
    const liveWords = liveTranscript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().split(/\s+/).filter(Boolean);

    if (liveWords.length === 0) {
      return index === 0 ? 'practice-word current' : 'practice-word default';
    }

    let liveIdx = 0;
    let wordStatus: 'correct' | 'incorrect' | 'default' | 'current' = 'default';

    for (let tIdx = 0; tIdx <= index; tIdx++) {
      if (tIdx >= targetWords.length) break;
      if (liveIdx >= liveWords.length) {
        if (tIdx === index) wordStatus = 'current';
        break;
      }

      const tWord = targetWords[tIdx];
      const lWord = liveWords[liveIdx];

      if (tWord === lWord) {
        if (tIdx === index) wordStatus = 'correct';
        liveIdx++;
      } else {
        const nextTWord = tIdx + 1 < targetWords.length ? targetWords[tIdx + 1] : '';
        if (nextTWord === lWord) {
          if (tIdx === index) wordStatus = 'incorrect';
        } else {
          if (tIdx === index) wordStatus = 'incorrect';
          liveIdx++;
        }
      }
    }

    return `practice-word ${wordStatus}`;
  };

  // ---------- Edge-like TTS helpers (browser SpeechSynthesis, prefers Microsoft/Edge voices when available) ----------
  const stopPlayback = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      } catch (e) {
        console.warn('Error stopping audio playback:', e);
      }
      audioRef.current = null;
    }

    if ((window as any).speechSynthesis) {
      try {
        (window as any).speechSynthesis.cancel();
      } catch (e) {
        console.warn('Error cancelling speech synthesis:', e);
      }
    }

    if (speechUtteranceRef.current) {
      speechUtteranceRef.current.onend = null;
      speechUtteranceRef.current.onerror = null;
      speechUtteranceRef.current = null;
    }

    setIsAudioPlaying(false);
    setCurrentAudioType(null);
  };

  const speakText = async (text: string, rate = 0.95) => {
    if (!text || typeof window === 'undefined') return;
    stopPlayback();
    // Try server-side TTS first
    try {
      const url = `http://127.0.0.1:8000/tts/generate?text=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const blob = new Blob([buf], { type: 'audio/mpeg' });
        const objectUrl = URL.createObjectURL(blob);
        const a = new Audio(objectUrl);
        audioRef.current = a;
        setIsAudioPlaying(true);
        setCurrentAudioType('reference');
        a.onended = () => {
          if (audioRef.current === a) {
            setIsAudioPlaying(false);
            setCurrentAudioType(null);
            audioRef.current = null;
          }
        };
        a.onerror = () => {
          if (audioRef.current === a) {
            setIsAudioPlaying(false);
            setCurrentAudioType(null);
            audioRef.current = null;
          }
        };
        await a.play();
        return;
      }
    } catch (e) {
      console.warn('Server TTS failed, falling back to browser TTS:', e);
    }

    // Fallback: browser SpeechSynthesis (prefers Edge/Microsoft voices if present)
    try {
      if (!(window as any).speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      const voices = (window as any).speechSynthesis.getVoices() || [];
      const preferred = voices.find((v: any) => /Microsoft|Zira|Aria|Davis|Guy|Hazel|Eva|Gwyneth/i.test(v.name));
      if (preferred) utter.voice = preferred;
      utter.onend = () => {
        if (speechUtteranceRef.current === utter) {
          setIsAudioPlaying(false);
          setCurrentAudioType(null);
          speechUtteranceRef.current = null;
        }
      };
      utter.onerror = () => {
        if (speechUtteranceRef.current === utter) {
          setIsAudioPlaying(false);
          setCurrentAudioType(null);
          speechUtteranceRef.current = null;
        }
      };
      speechUtteranceRef.current = utter;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      setIsAudioPlaying(true);
      setCurrentAudioType('reference');
    } catch (e) {
      console.error('Browser TTS error:', e);
    }
  };

  const playUserRecording = () => {
    if (!audioUrl) return;
    if (isAudioPlaying && currentAudioType === 'recording') {
      stopPlayback();
      return;
    }
    stopPlayback();
    try {
      const a = new Audio(audioUrl);
      audioRef.current = a;
      setIsAudioPlaying(true);
      setCurrentAudioType('recording');
      a.onended = () => {
        if (audioRef.current === a) {
          setIsAudioPlaying(false);
          setCurrentAudioType(null);
          audioRef.current = null;
        }
      };
      a.onerror = () => {
        if (audioRef.current === a) {
          setIsAudioPlaying(false);
          setCurrentAudioType(null);
          audioRef.current = null;
        }
      };
      a.play().catch((e) => console.error('Playback failed:', e));
    } catch (e) {
      console.error('Error playing user recording:', e);
    }
  };

  // Recharts Practice Progress Chart data formulation (Scale 0-10)
  const practiceChartData = [...sessionHistory]
    .reverse()
    .filter(s => s.session_category === 'practice' || s.type === 'practice')
    .map((session, idx) => {
      const date = new Date(session.created_at);
      const label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return {
        name: `${label} - p${idx}`,
        Score: session.pronunciation_score ?? 0,
      };
    });

  // Recharts Fluency Progress Chart data formulation (Scale 0-100)
  const fluencyChartData = [...sessionHistory]
    .reverse()
    .filter(s => s.session_category === 'analysis' || s.type === 'analysis')
    .map((session, idx) => {
      const date = new Date(session.created_at);
      const label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return {
        name: `${label} - f${idx}`,
        Score: session.final_score ?? 0,
      };
    });

  // Calculate Dashboard Averages
  const practiceSessions = sessionHistory.filter(s => s.session_category === 'practice' || s.type === 'practice');
  const analysisSessions = sessionHistory.filter(s => s.session_category === 'analysis' || s.type === 'analysis');
  const avgAccuracy = practiceSessions.length > 0
    ? (practiceSessions.reduce((acc, curr) => acc + (curr.pronunciation_score ?? 0), 0) / practiceSessions.length).toFixed(1)
    : '0.0';
  const avgFluency = analysisSessions.length > 0
    ? (analysisSessions.reduce((acc, curr) => acc + (curr.final_score ?? 0), 0) / analysisSessions.length).toFixed(1)
    : '0.0';

  // Filtered exercises list
  const filteredExercises = exercisesList.filter(ex => 
    ex.title.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
    ex.description.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.difficulty.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  // Swappable session history timeline mapping
  const filteredHistory = sessionHistory.filter(s => {
    if (historyTab === 'exercise') {
      return s.session_category === 'exercise' || s.type === 'exercise';
    }
    return (historyTab === 'practice' && (s.session_category === 'practice' || s.type === 'practice'))
      || (historyTab === 'analysis' && (s.session_category === 'analysis' || s.type === 'analysis'));
  });

  const visibleHistory = filteredHistory;

  return (
    <div className="container">
      <header className="app-header">
        <div className="logo-container" onClick={() => setActiveTab('dashboard')}>
          <Activity size={30} className="logo-icon" style={{ color: 'var(--primary)' }} />
          <span className="logo-text">SpeechAI</span>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="nav-tab-bar">
          <button className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setStatus('idle'); setStatusMessage('Ready to record'); }}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'practice' ? 'active' : ''}`} onClick={() => { setActiveTab('practice'); setStatus('idle'); setStatusMessage('Ready to record'); setPracticeResult(null); }}>
            <BookOpen size={16} />
            <span><span className="nav-module-prefix">Module 1: </span>Practice</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'fluency' ? 'active' : ''}`} onClick={() => { setActiveTab('fluency'); setStatus('idle'); setStatusMessage('Ready to record'); setAnalysisResult(null); }}>
            <BarChart3 size={16} />
            <span><span className="nav-module-prefix">Module 2: </span>Fluency</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'exercises' ? 'active' : ''}`} onClick={() => { setActiveTab('exercises'); setStatus('idle'); setStatusMessage('Ready to record'); }}>
            <Compass size={16} />
            <span>Exercises</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'video' ? 'active' : ''}`} onClick={() => { setActiveTab('video'); setStatus('idle'); setStatusMessage('Ready to record'); }}>
            <VideoIcon size={16} />
            <span><span className="nav-module-prefix">Module 3: </span>Video</span>
          </button>
        </div>
        
        <div className="header-actions">
          <div className="streak-pill">
            <Flame size={17} className="streak-flame-icon" />
            <span className="streak-pill-text">{streakCount} Day Streak</span>
          </div>

          <nav className="nav-links">
            {currentUser ? (
              <div className="user-profile-info">
                <span className="user-welcome-text">Welcome, <strong>{currentUser.name}</strong></span>
                <button className="nav-link sign-out-btn" onClick={handleSignOut}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button className="nav-link sign-in-btn" onClick={() => { setShowAuthModal(true); setAuthMode('login'); setAuthError(null); }}>
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content">

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="view-fade">
            <div className="dashboard-hero">
              <h1 className="hero-title">Speech Practice & Analytical Dashboard</h1>
              <p className="hero-subtitle">Monitor your pronunciation accuracy, disfluency counts, and daily practice streaks in one place.</p>
            </div>

            <div className="dashboard-grid">
              {/* Left Column: Stats & Streaks */}
              <div className="dashboard-column">
                <div className="glass-card stat-card-highlight">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Flame size={32} style={{ color: 'var(--secondary)', fill: 'var(--secondary)' }} />
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Daily Goal Streak</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Practice every consecutive UTC day</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {streakCount} <span style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>Days</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {streakCount > 0 ? "Fantastic! Keep up the daily practice rhythm." : "Start a practice drill to begin your daily streak!"}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="glass-card stat-metric-box">
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Practice Accuracy (Avg)</span>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>{avgAccuracy}/10</div>
                  </div>
                  <div className="glass-card stat-metric-box">
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Speech Fluency (Avg)</span>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--secondary)', marginTop: '8px' }}>{avgFluency}/10</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Two Separate Recharts Line Graphs */}
              <div className="dashboard-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Practice Accuracy Trend */}
                <div className="glass-card chart-container-card">
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
                    Practice Accuracy Trend (Scale 0-10)
                  </h3>
                  {practiceSessions.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>
                      <HelpCircle size={32} style={{ marginBottom: '10px' }} />
                      <p style={{ fontSize: '13px' }}>No practice sessions logged yet.</p>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={practiceChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tickFormatter={(val) => val.split(' - ')[0]} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                            labelFormatter={(label) => typeof label === 'string' ? label.split(' - ')[0] : ''}
                            formatter={(value: any) => [`${value}/10`, 'Pronunciation Score']}
                          />
                          <Line type="monotone" dataKey="Score" stroke="var(--primary)" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 2. Fluency Progress Trend */}
                <div className="glass-card chart-container-card">
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} style={{ color: 'var(--accent)' }} />
                    Fluency Progress Trend (Scale 0-10)
                  </h3>
                  {analysisSessions.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>
                      <HelpCircle size={32} style={{ marginBottom: '10px' }} />
                      <p style={{ fontSize: '13px' }}>No fluency analysis sessions logged yet.</p>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fluencyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tickFormatter={(val) => val.split(' - ')[0]} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                            labelFormatter={(label) => typeof label === 'string' ? label.split(' - ')[0] : ''}
                            formatter={(value: any) => [`${value}/10`, 'Fluency Score']}
                          />
                          <Line type="monotone" dataKey="Score" stroke="var(--accent)" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }}>
                            <LabelList dataKey="Score" position="top" style={{ fill: 'var(--text-primary)', fontSize: '10px' }} />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Swappable History Timelines Logs Panel */}
            <div className="glass-card" style={{ marginTop: '30px', textAlign: 'left', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={22} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {historyTab === 'practice' ? 'Practice History' : historyTab === 'analysis' ? 'Fluency History' : 'Exercise History'}
                  </h3>
                </div>

                {/* Sub-tab Swapper */}
                <div style={{ display: 'flex', gap: '6px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '2px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <button 
                    className={`nav-tab-btn ${historyTab === 'practice' ? 'active' : ''}`}
                    onClick={() => { setHistoryTab('practice'); setExpandedSessionId(null); }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Module 1: Practice
                  </button>
                  <button 
                    className={`nav-tab-btn ${historyTab === 'analysis' ? 'active' : ''}`}
                    onClick={() => { setHistoryTab('analysis'); setExpandedSessionId(null); }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Module 2: Fluency
                  </button>
                  <button 
                    className={`nav-tab-btn ${historyTab === 'exercise' ? 'active' : ''}`}
                    onClick={() => { setHistoryTab('exercise'); setExpandedSessionId(null); }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Exercise History
                  </button>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No session logs found for this module. Record a session to populate this list!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {visibleHistory.map((session, idx) => {
                    const date = new Date(session.created_at);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isExpanded = expandedSessionId === session.session_id;
                    const isExercisePractice = session.session_category === 'practice' || (session.type === 'exercise' && session.pronunciation_score !== undefined);
                    const isExerciseAnalysis = session.session_category === 'analysis' || (session.type === 'exercise' && session.final_score !== undefined);
                    const badgeColor = isExercisePractice || session.type === 'practice'
                      ? 'var(--primary-light)'
                      : 'var(--secondary-light)';
                    const badgeTextColor = isExercisePractice || session.type === 'practice'
                      ? 'var(--primary)'
                      : 'var(--secondary)';
                    const summaryScoreText = isExercisePractice
                      ? `Practice score: ${session.pronunciation_score ?? 0}/10`
                      : isExerciseAnalysis
                        ? `Fluency score: ${session.final_score ?? 0}/10`
                        : session.type === 'analysis'
                          ? `Fluency score: ${session.final_score ?? 0}/10`
                          : `Exercise score: ${session.pronunciation_score ?? session.final_score ?? 0}/10`;

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                fontSize: '10px', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                backgroundColor: badgeColor,
                                color: badgeTextColor
                              }}>
                                {session.type}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {summaryScoreText}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                              {session.type === 'practice' ? `Target: "${session.target_text}"`
                                : session.type === 'analysis' ? `Spoken: "${session.transcript || 'Speech'}"`
                                : `Exercise: ${session.exercise_title || session.exercise_id || 'Practice Drill'}`}
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dateStr}</span>
                            <button 
                              onClick={() => setExpandedSessionId(isExpanded ? null : session.session_id)}
                              style={{ 
                                fontSize: '12px', 
                                padding: '6px 12px', 
                                backgroundColor: isExpanded ? 'var(--bg-primary)' : 'var(--primary-light)', 
                                border: '1px solid var(--primary)', 
                                borderRadius: 'var(--radius-sm)', 
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                              }}
                            >
                              {isExpanded ? 'Hide Details' : 'View Report'}
                            </button>
                          </div>
                        </div>

                        {/* Expandable detailed scorecard panel */}
                        {isExpanded && (
                          <div className="view-fade">
                            {isExercisePractice ? (
                              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>{session.type === 'exercise' ? 'Exercise Pronunciation Metrics' : 'Pronunciation Accuracy Metrics'}</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '4px' }}>
                                    Score: <strong>{session.pronunciation_score}/10</strong>
                                  </span>
                                  <span style={{ fontSize: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '4px' }}>
                                    Word Error Rate (WER): <strong>{(session.word_error_rate ? session.word_error_rate * 100 : 0).toFixed(0)}%</strong>
                                  </span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                  <strong>Spoken text matched:</strong> <em>"{session.spoken_text}"</em>
                                </p>
                                {session.mismatched_words && session.mismatched_words.length > 0 && (
                                  <div style={{ marginTop: '12px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Mismatched words:</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {session.mismatched_words.map((w, idx) => (
                                        <span key={idx} style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                          Expected: "{w.expected}" → Said: "{w.spoken || '[omitted]'}"
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>Detailed Fluency Metrics</h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>WPM Rate</span>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>{session.wpm} WPM</div>
                                  </div>
                                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Filler Words</span>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>{session.filler_count}</div>
                                  </div>
                                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Stammers</span>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>{session.stammer_events}</div>
                                  </div>
                                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Long Pauses</span>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>{session.long_pauses}</div>
                                  </div>
                                </div>

                                {session.sub_scores && (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', marginBottom: '15px' }}>
                                    {Object.entries(session.sub_scores).map(([name, score], idx) => (
                                      <div key={idx} style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', borderColor: score < 6 ? 'var(--error)' : 'var(--border-color)' }}>
                                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{name.replace('_score', '')}</span>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: score < 6 ? 'var(--error)' : 'var(--success)', marginTop: '2px' }}>{score}/10</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {session.pause_details && session.pause_details.length > 0 && (
                                   <div style={{ marginBottom: '12px' }}>
                                     <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Detected pauses:</span>
                                     
                                     {/* Interactive visual timeline inside logs details */}
                                     <div style={{ 
                                       position: 'relative', 
                                       height: '10px', 
                                       backgroundColor: 'var(--bg-primary)', 
                                       border: '1px solid var(--border-color)', 
                                       borderRadius: '5px', 
                                       overflow: 'hidden', 
                                       width: '100%', 
                                       marginBottom: '6px' 
                                     }}>
                                       {session.pause_details.map((pause, idx) => {
                                         const total = session.duration_sec || 1;
                                         const leftPct = (pause.start / total) * 100;
                                         const widthPct = (pause.duration / total) * 100;
                                         return (
                                           <div 
                                             key={idx} 
                                             style={{ 
                                               position: 'absolute', 
                                               left: `${leftPct}%`, 
                                               width: `${widthPct}%`, 
                                               height: '100%', 
                                               backgroundColor: 'var(--error)',
                                               opacity: 0.8
                                             }}
                                           />
                                         );
                                       })}
                                     </div>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                       <span>0.0s</span>
                                       <span>{(session.duration_sec || 0).toFixed(1)}s</span>
                                     </div>

                                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                       {session.pause_details.map((pause, idx) => (
                                         <span key={idx} style={{ fontSize: '10px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '2px 6px', borderRadius: '4px' }}>
                                           {pause.duration}s gap at {pause.start}s
                                         </span>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 {session.ai_pathologist_feedback && (
                                   <div style={{ marginBottom: '15px', padding: '10px', borderLeft: '3px solid var(--accent)', backgroundColor: 'rgba(99,102,241,0.01)' }}>
                                     <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                       <Sparkles size={11} /> AI Speech Pathologist Assessment:
                                     </span>
                                     <p style={{ fontSize: '12px', color: 'var(--text-primary)', fontStyle: 'italic', margin: '0' }}>
                                       "{session.ai_pathologist_feedback}"
                                     </p>
                                   </div>
                                 )}

                                {session.feedback && session.feedback.length > 0 && (
                                  <div style={{ marginBottom: '15px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Therapy Feedback:</span>
                                    <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                                      {session.feedback.map((f, idx) => <li key={idx}>{f}</li>)}
                                    </ul>
                                  </div>
                                )}

                                {session.recommended_exercises && session.recommended_exercises.length > 0 && (
                                  <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Recommended Drills:</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {session.recommended_exercises.map((exId, idx) => {
                                        const exDetail = exercisesList.find(item => item._id === exId);
                                        return (
                                          <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{exDetail ? exDetail.title : exId.replace(/_/g, ' ')}</span>
                                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{exDetail ? exDetail.description : "Speech drill to improve fluency."}</p>
                                            </div>
                                            <button 
                                              onClick={() => {
                                                if (exDetail) {
                                                  setActiveTab('exercises');
                                                  startExerciseDrill(exDetail);
                                                } else {
                                                  const fallbackEx = {
                                                    _id: exId,
                                                    title: exId.replace(/_/g, ' '),
                                                    description: "Speech drill to improve fluency.",
                                                    difficulty: 'intermediate',
                                                    trigger_condition: 'automatic'
                                                  };
                                                  setActiveTab('exercises');
                                                  startExerciseDrill(fallbackEx);
                                                }
                                              }}
                                              style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '3px', color: 'var(--text-primary)', cursor: 'pointer' }}
                                            >
                                              Launch
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MODULE 1: PRACTICE MODULE */}
        {activeTab === 'practice' && (
          <div className="view-fade">
            <div className="dashboard-hero" style={{ marginBottom: '24px' }}>
              <h1 className="hero-title">Module 1: Practice Trainer</h1>
              <p className="hero-subtitle">Read the target passage aloud. Whisper grades your articulation accuracy.</p>
            </div>

            {/* Top Full-Width Target Pronunciation Box */}
            <div className="glass-card" style={{ marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📖 Target Practice Text
                </h3>
                <button
                  onClick={() => isAudioPlaying && currentAudioType === 'reference' ? stopPlayback() : speakText(targetSentence)}
                  className="tts-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    marginTop: '0'
                  }}
                >
                  {isAudioPlaying && currentAudioType === 'reference' ? (
                    <Square size={14} style={{ color: 'var(--error)' }} />
                  ) : (
                    <Volume2 size={14} style={{ color: 'var(--primary)' }} />
                  )}
                  {isAudioPlaying && currentAudioType === 'reference' ? 'Stop' : 'Listen to Guide'}
                </button>
              </div>
              {!practiceResult ? (
                <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none' }}>
                  {targetSentence.split(' ').map((word, idx) => (
                    <span key={idx} className={getLiveWordColorClass(word, idx)}>{word} </span>
                  ))}
                </div>
              ) : (
                <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none' }}>
                  {renderWordDiff()}
                </div>
              )}
            </div>

            <div className="workspace-layout">
              {/* Left Column: Configuration Controls */}
              <div className="workspace-panel config-panel">
                <div>
                  <h2 className="panel-title">1. Practice Settings</h2>
                  <p className="panel-subtitle" style={{ marginBottom: '16px' }}>Configure how you want to load or generate target text passages.</p>
                  
                  {/* Segmented Sub-Tab Switcher */}
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <button 
                      onClick={() => setConfigTabM1('presets')}
                      style={{ 
                        flex: 1, 
                        padding: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: configTabM1 === 'presets' ? 'var(--bg-secondary)' : 'transparent', 
                        border: configTabM1 === 'presets' ? '1px solid var(--border-color)' : 'none', 
                        color: configTabM1 === 'presets' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      📋 Presets
                    </button>
                    <button 
                      onClick={() => setConfigTabM1('custom')}
                      style={{ 
                        flex: 1, 
                        padding: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: configTabM1 === 'custom' ? 'var(--bg-secondary)' : 'transparent', 
                        border: configTabM1 === 'custom' ? '1px solid var(--border-color)' : 'none', 
                        color: configTabM1 === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      ✏ Custom
                    </button>
                    <button 
                      onClick={() => setConfigTabM1('grok')}
                      style={{ 
                        flex: 1, 
                        padding: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: configTabM1 === 'grok' ? 'rgba(168, 85, 247, 0.1)' : 'transparent', 
                        border: configTabM1 === 'grok' ? '1px solid var(--secondary)' : 'none', 
                        color: configTabM1 === 'grok' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      ✨ Grok AI
                    </button>
                  </div>

                  {/* Render Tab Content */}
                  {configTabM1 === 'presets' && (
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Select Exercise Template</label>
                      <select 
                        style={{ 
                          padding: '12px', 
                          backgroundColor: 'var(--bg-primary)', 
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          width: '100%',
                          fontSize: '14px'
                        }}
                        value={targetSentence}
                        onChange={(e) => { setTargetSentence(e.target.value); setPracticeResult(null); }}
                      >
                        {SAMPLE_SENTENCES.map((s, idx) => (
                          <option key={idx} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {configTabM1 === 'custom' && (
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Write Custom Target Phrase</label>
                      <input 
                        type="text" 
                        className="form-input"
                        style={{ padding: '12px', fontSize: '14px' }}
                        value={targetSentence}
                        onChange={(e) => { setTargetSentence(e.target.value); setPracticeResult(null); }}
                        placeholder="Type custom text to practice..."
                      />
                    </div>
                  )}

                  {configTabM1 === 'grok' && (
                    <div className="glass-card" style={{ padding: '16px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Generate Custom Text with Grok AI
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '10px' }}>Topic Keyword</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            value={aiTopic}
                            onChange={e => setAiTopic(e.target.value)}
                            placeholder="Space, Cooking, AI..."
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                            <label className="form-label" style={{ fontSize: '10px' }}>Length</label>
                            <select 
                              style={{ 
                                padding: '6px', 
                                backgroundColor: 'var(--bg-primary)', 
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px'
                              }}
                              value={aiLength}
                              onChange={e => setAiLength(e.target.value)}
                            >
                              <option value="sentence">Sentence</option>
                              <option value="paragraph">Paragraph</option>
                              <option value="long_paragraph">Long Paragraph</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                            <label className="form-label" style={{ fontSize: '10px' }}>Exercise Focus</label>
                            <select 
                              style={{ 
                                padding: '6px', 
                                backgroundColor: 'var(--bg-primary)', 
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px'
                              }}
                              value={aiFocusExercise}
                              onChange={e => setAiFocusExercise(e.target.value)}
                            >
                              <option value="none">None</option>
                              <option value="silent_pause_drill">Silent Pause Focus</option>
                              <option value="slow_rate_reading">Slow Rate Focus</option>
                              <option value="articulation_drill">Articulation Focus</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          onClick={handleGenerateText} 
                          className="submit-btn" 
                          disabled={isGenerating}
                          style={{ padding: '8px', fontSize: '13px', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw size={14} className="spin" /> Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> Generate with Grok AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Recording Workspace */}
              <div className="workspace-panel recording-panel">
                <div>
                  <h2 className="panel-title">2. Speak & Record</h2>
                  <p className="panel-subtitle" style={{ marginBottom: '20px' }}>Activate the mic and read the target passage cleanly. The analysis evaluates phoneme accuracy.</p>
                </div>

                <div className={`recorder-container ${isRecording ? 'recording' : ''}`} style={{ width: '100%', minHeight: '230px', margin: '0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className={`status-badge ${status}`}>
                    {status === 'recording' && <span className="pulse-dot" style={{ width: '8px', height: '8px', backgroundColor: 'var(--error)', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }}></span>}
                    {statusMessage}
                  </div>

                  <div className="record-btn-wrapper">
                    {!isRecording ? (
                      <button className="record-btn" onClick={startRecording}>
                        <Mic size={36} />
                      </button>
                    ) : (
                      <button className="record-btn recording" onClick={stopRecording}>
                        <Square size={32} />
                      </button>
                    )}
                  </div>

                  {isRecording && (
                    <div className="visualizer-waves">
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                    </div>
                  )}

                  {liveTranscript && (
                    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Client Live Feed (Web Speech):</span>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{liveTranscript}...</p>
                    </div>
                  )}

                  {audioUrl && !isRecording && (
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Playback:</span>
                      <button
                        onClick={() => playUserRecording()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {isAudioPlaying && currentAudioType === 'recording' ? (
                          <Square size={14} style={{ color: 'var(--error)' }} />
                        ) : (
                          <Play size={14} style={{ color: 'var(--success)' }} />
                        )}
                        {isAudioPlaying && currentAudioType === 'recording' ? 'Stop' : 'Play My Recording'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Practice Accuracy Scorecard */}
            {practiceResult && (
              <div className="glass-card result-section" style={{ marginTop: '30px' }}>
                <h3 className="feedback-title" style={{ textAlign: 'center' }}>Pronunciation Analysis</h3>
                <div className="result-grid">
                  <div className="score-panel">
                    <div className="score-circle">
                      <span className="score-val">{practiceResult.pronunciation_score}</span>
                      <span className="score-label">/ 10</span>
                    </div>
                    <h4 className="score-heading">Accuracy Score</h4>
                    <p className="score-desc">
                      {practiceResult.pronunciation_score >= 8 ? 'Excellent pronunciation!' : 
                       practiceResult.pronunciation_score >= 6 ? 'Good, minor errors found.' : 
                       'Needs practice. Try slowly pronouncing the red words.'}
                    </p>
                  </div>
                  
                  <div className="feedback-panel">
                    <h4 className="feedback-title">Detailed Stats</h4>
                    <ul className="feedback-list">
                      <li className="feedback-item">
                        <span className="feedback-bullet">✔</span>
                        <span>Word Error Rate (WER): <strong>{(practiceResult.word_error_rate * 100).toFixed(0)}%</strong></span>
                      </li>
                      <li className="feedback-item">
                        <span className="feedback-bullet">✔</span>
                        <span>Spoken text matched: <em>"{practiceResult.spoken_text}"</em></span>
                      </li>
                      {practiceResult.mismatched_words.length > 0 && (
                        <li className="feedback-item" style={{ flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>Mismatched words:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {practiceResult.mismatched_words.map((w, idx) => (
                              <span key={idx} style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Expected: "{w.expected}" 
                                <button 
                                  onClick={() => speakText(w.expected)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0',
                                    color: 'var(--error)',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                  title="Listen to pronunciation"
                                >
                                  <Volume2 size={12} />
                                </button>
                                → Said: "{w.spoken || '[omitted]'}"
                              </span>
                            ))}
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. MODULE 3: FLUENCY MODULE */}
        {activeTab === 'fluency' && (
          <div className="view-fade">
            <div className="dashboard-hero" style={{ marginBottom: '24px' }}>
              <h1 className="hero-title">Module 2: Fluency Tracker</h1>
              <p className="hero-subtitle">Practice impromptu topics or read dynamic target passages to track filler words, pacing, and silences.</p>
            </div>

            {/* Target Practice Text card (renders only if fluencyTargetText is set) */}
            {fluencyTargetText && (
              <div className="glass-card" style={{ marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📖 Target Reading Passage
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => isAudioPlaying && currentAudioType === 'reference' ? stopPlayback() : speakText(fluencyTargetText)}
                      style={{
                        fontSize: '11px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {isAudioPlaying && currentAudioType === 'reference' ? (
                        <Square size={12} style={{ color: 'var(--error)' }} />
                      ) : (
                        <Volume2 size={12} style={{ color: 'var(--primary)' }} />
                      )}
                      {isAudioPlaying && currentAudioType === 'reference' ? 'Stop' : 'Listen Reference'}
                    </button>
                    <button 
                      onClick={() => { setFluencyTargetText(''); setAnalysisResult(null); }}
                      style={{ 
                        fontSize: '11px', 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.3)', 
                        color: 'var(--error)', 
                        padding: '4px 8px', 
                        borderRadius: 'var(--radius-sm)', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ✕ Clear passage to speak impromptu
                    </button>
                  </div>
                </div>
                {!analysisResult ? (
                  <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none' }}>
                    {fluencyTargetText.split(' ').map((word, idx) => (
                      <span key={idx} className={getLiveWordColorClass(word, idx)}>{word} </span>
                    ))}
                  </div>
                ) : (
                  <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {fluencyTargetText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/).map((word, index) => {
                        const mismatchedIndices = new Set((analysisResult.mismatched_words || []).map((w: any) => w.index));
                        const isMismatched = mismatchedIndices.has(index);
                        return (
                          <span 
                            key={index} 
                            className={`practice-word ${isMismatched ? 'incorrect' : 'correct'}`}
                          >
                            {word}{' '}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="workspace-layout">
              {/* Left Column: Speaking Topic Prompt OR Passage Generator */}
              <div className="workspace-panel config-panel">
                <div>
                  <h2 className="panel-title">1. Fluency Settings</h2>
                  <p className="panel-subtitle" style={{ marginBottom: '16px' }}>Practice impromptu topic prompts or generate dynamic reading paragraphs.</p>
                  
                  {/* Segmented Switcher */}
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <button 
                      onClick={() => setConfigTabM2('prompt')}
                      style={{ 
                        flex: 1, 
                        padding: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: configTabM2 === 'prompt' ? 'var(--bg-secondary)' : 'transparent', 
                        border: configTabM2 === 'prompt' ? '1px solid var(--border-color)' : 'none', 
                        color: configTabM2 === 'prompt' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      💡 Topic Prompts
                    </button>
                    <button 
                      onClick={() => setConfigTabM2('grok')}
                      style={{ 
                        flex: 1, 
                        padding: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: configTabM2 === 'grok' ? 'rgba(168, 85, 247, 0.1)' : 'transparent', 
                        border: configTabM2 === 'grok' ? '1px solid var(--secondary)' : 'none', 
                        color: configTabM2 === 'grok' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      ✨ Grok AI
                    </button>
                  </div>

                  {/* Render content based on sub-tab selection */}
                  {configTabM2 === 'prompt' && (
                    <div className="practice-sentence-box" style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--text-secondary)', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '16px' }}>
                      <p style={{ margin: '0' }}>💡 Impromptu Prompt: "{TOPIC_PROMPTS[promptIndex]}"</p>
                      <button 
                        onClick={() => setPromptIndex((promptIndex + 1) % TOPIC_PROMPTS.length)}
                        style={{ 
                          alignSelf: 'flex-end', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '11px', 
                          backgroundColor: 'rgba(255,255,255,0.04)', 
                          padding: '4px 10px', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          marginTop: '8px'
                        }}
                      >
                        <RefreshCw size={11} /> Next Prompt
                      </button>
                    </div>
                  )}

                  {configTabM2 === 'grok' && (
                    <div className="glass-card" style={{ padding: '16px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Generate Custom Text with Grok AI
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: '4px' }}>
                          <label className="form-label" style={{ fontSize: '10px' }}>Topic Keyword</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            value={aiTopic}
                            onChange={e => setAiTopic(e.target.value)}
                            placeholder="Space, Cooking, AI..."
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                            <label className="form-label" style={{ fontSize: '10px' }}>Length</label>
                            <select 
                              style={{ 
                                padding: '6px', 
                                backgroundColor: 'var(--bg-primary)', 
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px'
                              }}
                              value={aiLength === 'sentence' ? 'paragraph' : aiLength}
                              onChange={e => setAiLength(e.target.value)}
                            >
                              <option value="paragraph">Paragraph</option>
                              <option value="long_paragraph">Long Paragraph</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                            <label className="form-label" style={{ fontSize: '10px' }}>Exercise Focus</label>
                            <select 
                              style={{ 
                                padding: '6px', 
                                backgroundColor: 'var(--bg-primary)', 
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px'
                              }}
                              value={aiFocusExercise}
                              onChange={e => setAiFocusExercise(e.target.value)}
                            >
                              <option value="none">None</option>
                              <option value="silent_pause_drill">Silent Pause Focus</option>
                              <option value="slow_rate_reading">Slow Rate Focus</option>
                              <option value="articulation_drill">Articulation Focus</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          onClick={handleGenerateText} 
                          className="submit-btn" 
                          disabled={isGenerating}
                          style={{ padding: '8px', fontSize: '13px', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw size={14} className="spin" /> Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> Generate with Grok AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Symmetrical Recording Workspace */}
              <div className="workspace-panel recording-panel">
                <div>
                  <h2 className="panel-title">2. Speak & Record</h2>
                  <p className="panel-subtitle" style={{ marginBottom: '20px' }}>
                    {!fluencyTargetText 
                      ? 'Speak freely on the prompt. Pacing, stammers, and silences will be tracked.' 
                      : 'Read the target passage aloud. Word accuracy and pacing will be tracked.'}
                  </p>
                </div>

                <div className={`recorder-container ${isRecording ? 'recording' : ''}`} style={{ width: '100%', minHeight: '230px', margin: '0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className={`status-badge ${status}`}>
                    {status === 'recording' && <span className="pulse-dot" style={{ width: '8px', height: '8px', backgroundColor: 'var(--error)', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }}></span>}
                    {statusMessage}
                  </div>

                  <div className="record-btn-wrapper">
                    {!isRecording ? (
                      <button className="record-btn" onClick={startRecording}>
                        <Mic size={36} />
                      </button>
                    ) : (
                      <button className="record-btn recording" onClick={stopRecording}>
                        <Square size={32} />
                      </button>
                    )}
                  </div>

                  {isRecording && (
                    <div className="visualizer-waves">
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                    </div>
                  )}

                  {liveTranscript && (
                    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Client Live Feed (Web Speech):</span>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{liveTranscript}...</p>
                    </div>
                  )}

                  {audioUrl && !isRecording && (
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Playback:</span>
                      <button
                        onClick={() => playUserRecording()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {isAudioPlaying && currentAudioType === 'recording' ? (
                          <Square size={14} style={{ color: 'var(--error)' }} />
                        ) : (
                          <Play size={14} style={{ color: 'var(--success)' }} />
                        )}
                        {isAudioPlaying && currentAudioType === 'recording' ? 'Stop' : 'Play My Recording'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fluency Score Report */}
            {analysisResult && (
              <div className="glass-card result-section" style={{ marginTop: '30px' }}>
                <h3 className="feedback-title" style={{ textAlign: 'center' }}>Fluency & Clarity Analysis</h3>
                
                <div className="result-grid">
                  <div className="score-panel">
                    <div className="score-circle" style={{ borderColor: 'var(--secondary-light)', borderTopColor: 'var(--secondary)' }}>
                      <span className="score-val">{analysisResult.final_score}</span>
                      <span className="score-label">/ 10</span>
                    </div>
                    <h4 className="score-heading">Overall Fluency Score</h4>
                    <p className="score-desc">
                      Pacing: {analysisResult.wpm} WPM ({analysisResult.duration_sec.toFixed(1)}s)
                    </p>
                  </div>
                  
                  <div className="feedback-panel">
                    <h4 className="feedback-title">Disfluency Markers</h4>
                    <ul className="feedback-list">
                      <li className="feedback-item">
                        <span className="feedback-bullet">▸</span>
                        <span>Filler words: <strong>{analysisResult.filler_count}</strong> {analysisResult.filler_words_found.length > 0 && `(${analysisResult.filler_words_found.join(', ')})`}</span>
                      </li>
                      <li className="feedback-item">
                        <span className="feedback-bullet">▸</span>
                        <span>Stammer / repetitions: <strong>{analysisResult.stammer_events}</strong> instances</span>
                      </li>
                      <li className="feedback-item">
                        <span className="feedback-bullet">▸</span>
                        <span>Long pauses (&gt;1.5s): <strong>{analysisResult.long_pauses}</strong> detected</span>
                      </li>
                      <li className="feedback-item">
                        <span className="feedback-bullet">▸</span>
                        <span>Speech rate: <strong>{analysisResult.wpm} WPM</strong> (Ideal: 120-150)</span>
                      </li>
                    </ul>

                    {analysisResult.pause_details && analysisResult.pause_details.length > 0 && (
                      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>⏱️ Detected Pause Locations:</h5>
                        
                        {/* Interactive Pause timeline bar */}
                        <div style={{ 
                          position: 'relative', 
                          height: '12px', 
                          backgroundColor: 'var(--bg-primary)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          overflow: 'hidden', 
                          width: '100%', 
                          marginBottom: '8px' 
                        }}>
                          {analysisResult.pause_details.map((pause, idx) => {
                            const total = analysisResult.duration_sec || 1;
                            const leftPct = (pause.start / total) * 100;
                            const widthPct = (pause.duration / total) * 100;
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  position: 'absolute', 
                                  left: `${leftPct}%`, 
                                  width: `${widthPct}%`, 
                                  height: '100%', 
                                  backgroundColor: 'var(--error)',
                                  opacity: 0.8
                                }}
                                title={`Pause: ${pause.duration}s (from ${pause.start}s to ${pause.end}s)`}
                              />
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          <span>0.0s</span>
                          <span>{(analysisResult.duration_sec || 0).toFixed(1)}s</span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {analysisResult.pause_details.map((pause, idx) => (
                            <span key={idx} style={{ fontSize: '11px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '4px' }}>
                              {pause.duration}s gap at {pause.start}s
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI pathologist assessment feedback */}
                    {analysisResult.ai_pathologist_feedback && (
                      <div className="feedback-panel" style={{ marginTop: '16px', borderLeft: '4px solid var(--accent)', backgroundColor: 'rgba(99, 102, 241, 0.02)' }}>
                        <h4 className="feedback-title" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Sparkles size={14} /> AI Speech Pathologist Assessment
                        </h4>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', fontStyle: 'italic', margin: '4px 0 0' }}>
                          "{analysisResult.ai_pathologist_feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-scores warning rings */}
                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)', 
                    textAlign: 'center', 
                    border: '1px solid var(--border-color)',
                    borderColor: analysisResult.sub_scores.filler_score < 6 ? 'var(--error)' : 'var(--border-color)',
                    boxShadow: analysisResult.sub_scores.filler_score < 6 ? '0 0 10px rgba(244, 63, 94, 0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      Filler Score
                      {analysisResult.sub_scores.filler_score < 6 && <AlertTriangle size={12} style={{ color: 'var(--error)' }} />}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: analysisResult.sub_scores.filler_score < 6 ? 'var(--error)' : 'var(--primary)', marginTop: '4px' }}>{analysisResult.sub_scores.filler_score}/10</div>
                  </div>

                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)', 
                    textAlign: 'center', 
                    border: '1px solid var(--border-color)',
                    borderColor: analysisResult.sub_scores.stammer_score < 6 ? 'var(--error)' : 'var(--border-color)',
                    boxShadow: analysisResult.sub_scores.stammer_score < 6 ? '0 0 10px rgba(244, 63, 94, 0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      Stammer Score
                      {analysisResult.sub_scores.stammer_score < 6 && <AlertTriangle size={12} style={{ color: 'var(--error)' }} />}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: analysisResult.sub_scores.stammer_score < 6 ? 'var(--error)' : 'var(--primary)', marginTop: '4px' }}>{analysisResult.sub_scores.stammer_score}/10</div>
                  </div>

                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)', 
                    textAlign: 'center', 
                    border: '1px solid var(--border-color)',
                    borderColor: analysisResult.sub_scores.pause_score < 6 ? 'var(--error)' : 'var(--border-color)',
                    boxShadow: analysisResult.sub_scores.pause_score < 6 ? '0 0 10px rgba(244, 63, 94, 0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      Pause Score
                      {analysisResult.sub_scores.pause_score < 6 && <AlertTriangle size={12} style={{ color: 'var(--error)' }} />}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: analysisResult.sub_scores.pause_score < 6 ? 'var(--error)' : 'var(--primary)', marginTop: '4px' }}>{analysisResult.sub_scores.pause_score}/10</div>
                  </div>

                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)', 
                    textAlign: 'center', 
                    border: '1px solid var(--border-color)',
                    borderColor: analysisResult.sub_scores.rate_score < 6 ? 'var(--error)' : 'var(--border-color)',
                    boxShadow: analysisResult.sub_scores.rate_score < 6 ? '0 0 10px rgba(244, 63, 94, 0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      Rate Score
                      {analysisResult.sub_scores.rate_score < 6 && <AlertTriangle size={12} style={{ color: 'var(--error)' }} />}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: analysisResult.sub_scores.rate_score < 6 ? 'var(--error)' : 'var(--primary)', marginTop: '4px' }}>{analysisResult.sub_scores.rate_score}/10</div>
                  </div>

                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)', 
                    textAlign: 'center', 
                    border: '1px solid var(--border-color)',
                    borderColor: analysisResult.sub_scores.clarity_score < 6 ? 'var(--error)' : 'var(--border-color)',
                    boxShadow: analysisResult.sub_scores.clarity_score < 6 ? '0 0 10px rgba(244, 63, 94, 0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      Clarity Score
                      {analysisResult.sub_scores.clarity_score < 6 && <AlertTriangle size={12} style={{ color: 'var(--error)' }} />}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: analysisResult.sub_scores.clarity_score < 6 ? 'var(--error)' : 'var(--primary)', marginTop: '4px' }}>{analysisResult.sub_scores.clarity_score}/10</div>
                  </div>
                </div>

                {/* Recommendations and feedback matching */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px', textAlign: 'left' }}>
                  <div className="feedback-panel">
                    <h4 className="feedback-title" style={{ color: 'var(--accent)' }}>Therapy Feedback & Advice</h4>
                    <ul className="feedback-list">
                      {analysisResult.feedback.map((f, idx) => (
                        <li className="feedback-item" key={idx}>
                          <span className="feedback-bullet">✦</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="feedback-panel">
                    <h4 className="feedback-title" style={{ color: 'var(--success)' }}>Recommended Database Exercises</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {analysisResult.recommended_exercises.map((exId, idx) => {
                        const exDetail = exercisesList.find(item => item._id === exId);
                        
                        return (
                          <div key={idx} className="recommended-exercise-item">
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <h5 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                  {exDetail ? exDetail.title : exId.replace(/_/g, ' ')}
                                </h5>
                                {exDetail && (
                                  <span style={{ 
                                    fontSize: '9px', 
                                    padding: '1px 6px', 
                                    borderRadius: '3px',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    backgroundColor: exDetail.difficulty === 'beginner' ? 'rgba(16, 185, 129, 0.1)' : exDetail.difficulty === 'intermediate' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                    color: exDetail.difficulty === 'beginner' ? 'var(--success)' : exDetail.difficulty === 'intermediate' ? 'var(--warning)' : 'var(--error)'
                                  }}>
                                    {exDetail.difficulty}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {exDetail ? exDetail.description : "Practice this drill to work on your matching speech fluency indicator."}
                              </p>
                            </div>
                            
                            <button 
                              onClick={() => {
                                if (exDetail) {
                                  setActiveTab('exercises');
                                  startExerciseDrill(exDetail);
                                } else {
                                  const fallbackEx = {
                                    _id: exId,
                                    title: exId.replace(/_/g, ' '),
                                    description: "Practice this drill to work on your matching speech fluency indicator.",
                                    difficulty: 'intermediate',
                                    trigger_condition: 'automatic'
                                  };
                                  setActiveTab('exercises');
                                  startExerciseDrill(fallbackEx);
                                }
                              }}
                              style={{ 
                                fontSize: '12px', 
                                padding: '6px 12px', 
                                backgroundColor: 'var(--primary-light)', 
                                border: '1px solid var(--primary)', 
                                borderRadius: 'var(--radius-sm)', 
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                marginLeft: '15px'
                              }}
                            >
                              Start Drill
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. EXERCISES LIBRARY VIEW */}
        {activeTab === 'exercises' && (
          <div className="view-fade">
            {activeExerciseDetail ? (
              <div style={{ width: '100%' }}>
                {/* Back button */}
                <button 
                  onClick={() => setActiveExerciseDetail(null)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    marginBottom: '20px',
                    padding: '0',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  ← Back to Drills Library
                </button>

                {/* Full-width Exercise Guidelines Card (Visible First) */}
                <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border-color)', marginBottom: '24px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        backgroundColor: activeExerciseDetail.difficulty === 'beginner' ? 'rgba(16, 185, 129, 0.1)' : activeExerciseDetail.difficulty === 'intermediate' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: activeExerciseDetail.difficulty === 'beginner' ? 'var(--success)' : activeExerciseDetail.difficulty === 'intermediate' ? 'var(--warning)' : 'var(--error)',
                        display: 'inline-block',
                        marginBottom: '8px'
                      }}>
                        {activeExerciseDetail.difficulty} Level (Default)
                      </span>
                      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                        {activeExerciseDetail.title}
                      </h1>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0' }}>
                        {activeExerciseDetail.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🎯 Clinical Objective
                      </h4>
                      <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {EXERCISE_INSTRUCTION_MAP[activeExerciseDetail._id]?.objective || "This therapy exercise aims to help you master control over your pacing, articulation, and timing during speech delivery."}
                      </p>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📖 How to Perform
                      </h4>
                      <ul style={{ margin: '0', padding: '0 0 0 14px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                        {(EXERCISE_INSTRUCTION_MAP[activeExerciseDetail._id]?.howToPerform || []).map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✨ Therapeutic Benefits
                      </h4>
                      <ul style={{ margin: '0', padding: '0 0 0 14px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                        {(EXERCISE_INSTRUCTION_MAP[activeExerciseDetail._id]?.advantages || []).map((adv, aIdx) => (
                          <li key={aIdx} style={{ listStyleType: 'square' }}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Target Practice Text card (only renders if exerciseTargetText is set and it's not impromptu speaking) */}
                {activeExerciseDetail._id !== "advanced_impromptu_speaking" && exerciseTargetText && (
                  <div className="glass-card" style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📖 Target Practice Passage
                      </h3>
                      <button
                        onClick={() => isAudioPlaying && currentAudioType === 'reference' ? stopPlayback() : speakText(exerciseTargetText)}
                        style={{
                          fontSize: '11px',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {isAudioPlaying && currentAudioType === 'reference' ? (
                          <Square size={12} style={{ color: 'var(--error)' }} />
                        ) : (
                          <Volume2 size={12} style={{ color: 'var(--primary)' }} />
                        )}
                        {isAudioPlaying && currentAudioType === 'reference' ? 'Stop' : 'Listen Reference'}
                      </button>
                    </div>
                    {!practiceResult ? (
                      <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none' }}>
                        {exerciseTargetText.split(' ').map((word, idx) => (
                          <span key={idx} className={getLiveWordColorClass(word, idx)}>{word} </span>
                        ))}
                      </div>
                    ) : (
                      <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {exerciseTargetText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/).map((word, index) => {
                            const mismatchedIndices = new Set(practiceResult.mismatched_words.map(w => w.index));
                            const isMismatched = mismatchedIndices.has(index);
                            return (
                              <span 
                                key={index} 
                                className={`practice-word ${isMismatched ? 'incorrect' : 'correct'}`}
                              >
                                {word}{' '}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Impromptu Topic Prompt Card (for advanced impromptu speaking) */}
                {activeExerciseDetail._id === "advanced_impromptu_speaking" && (
                  <div className="glass-card" style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        💡 Impromptu Speaking Topic
                      </h3>
                      <button 
                        onClick={() => setPromptIndex((promptIndex + 1) % TOPIC_PROMPTS.length)}
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '11px', 
                          backgroundColor: 'rgba(255,255,255,0.04)', 
                          padding: '4px 10px', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={12} /> Next Topic Prompt
                      </button>
                    </div>
                    <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', border: 'none', fontStyle: 'italic' }}>
                      "{TOPIC_PROMPTS[promptIndex]}"
                    </div>
                  </div>
                )}

                <div className="workspace-layout">
                  {/* Left Column: Practice Settings configuration matching Module 1 */}
                  <div className="workspace-panel config-panel" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h2 className="panel-title">1. Practice Settings</h2>
                      <p className="panel-subtitle" style={{ marginBottom: '16px' }}>Configure difficulty level and how to load target passages.</p>

                      {/* Difficulty Level Switcher */}
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Difficulty Level</label>
                        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => {
                                setExerciseDifficulty(lvl);
                                const newPresets = getPresetsForExercise(activeExerciseDetail._id, lvl);
                                setExerciseTargetText(newPresets[0]);
                                setPracticeResult(null);
                                setAnalysisResult(null);
                              }}
                              style={{
                                flex: 1,
                                padding: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'capitalize',
                                backgroundColor: exerciseDifficulty === lvl ? 'var(--bg-secondary)' : 'transparent',
                                border: exerciseDifficulty === lvl ? '1px solid var(--border-color)' : 'none',
                                color: exerciseDifficulty === lvl ? 'var(--text-primary)' : 'var(--text-secondary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)'
                              }}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Unified drill tab switcher */}
                      <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                        <button 
                          onClick={() => { setConfigTabExM1('presets'); setPracticeResult(null); setAnalysisResult(null); }}
                          style={{ 
                            flex: 1, 
                            padding: '8px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            backgroundColor: configTabExM1 === 'presets' ? 'var(--bg-secondary)' : 'transparent', 
                            border: configTabExM1 === 'presets' ? '1px solid var(--border-color)' : 'none', 
                            color: configTabExM1 === 'presets' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          📋 Presets
                        </button>
                        <button 
                          onClick={() => { setConfigTabExM1('custom'); setPracticeResult(null); setAnalysisResult(null); }}
                          style={{ 
                            flex: 1, 
                            padding: '8px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            backgroundColor: configTabExM1 === 'custom' ? 'var(--bg-secondary)' : 'transparent', 
                            border: configTabExM1 === 'custom' ? '1px solid var(--border-color)' : 'none', 
                            color: configTabExM1 === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          ✏ Custom
                        </button>
                        <button 
                          onClick={() => { setConfigTabExM1('grok'); setPracticeResult(null); setAnalysisResult(null); }}
                          style={{ 
                            flex: 1, 
                            padding: '8px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            backgroundColor: configTabExM1 === 'grok' ? 'rgba(168, 85, 247, 0.1)' : 'transparent', 
                            border: configTabExM1 === 'grok' ? '1px solid var(--secondary)' : 'none', 
                            color: configTabExM1 === 'grok' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          ✨ Grok AI
                        </button>
                      </div>

                      {/* Sub-tab content */}
                      {configTabExM1 === 'presets' && (
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <label className="form-label">Select Drill Preset</label>
                          <select 
                            style={{ 
                              padding: '12px', 
                              backgroundColor: 'var(--bg-primary)', 
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              width: '100%',
                              fontSize: '14px'
                            }}
                            value={exerciseTargetText}
                            onChange={(e) => { setExerciseTargetText(e.target.value); setPracticeResult(null); setAnalysisResult(null); }}
                          >
                            {getPresetsForExercise(activeExerciseDetail._id, exerciseDifficulty).map((presetText, pIdx) => (
                              <option key={pIdx} value={presetText}>
                                {presetText.length > 50 ? `${presetText.substring(0, 50)}...` : presetText}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {configTabExM1 === 'custom' && (
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <label className="form-label">Write Custom Target Text</label>
                          <input 
                            type="text" 
                            className="form-input"
                            style={{ padding: '12px', fontSize: '14px', width: '100%' }}
                            value={exerciseTargetText}
                            onChange={(e) => { setExerciseTargetText(e.target.value); setPracticeResult(null); setAnalysisResult(null); }}
                            placeholder="Type custom text to practice in this drill..."
                          />
                        </div>
                      )}

                      {configTabExM1 === 'grok' && (
                        <div className="glass-card" style={{ padding: '16px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Generate Custom Text with Grok AI
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: '4px' }}>
                              <label className="form-label" style={{ fontSize: '10px' }}>Topic Keyword</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '6px 12px', fontSize: '13px', width: '100%' }}
                                value={aiTopic}
                                onChange={e => setAiTopic(e.target.value)}
                                placeholder="Space, Science, Speech..."
                              />
                            </div>
                            <button 
                              onClick={() => handleGenerateExerciseText(activeExerciseDetail._id)} 
                              className="submit-btn" 
                              disabled={isGenerating}
                              style={{ padding: '8px', fontSize: '13px', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                              {isGenerating ? (
                                <><RefreshCw size={14} className="spin" /> Generating...</>
                              ) : (
                                <><Sparkles size={14} /> Generate with Grok AI</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Speak & Record workspace (Exact mirror of M1/M2 layout) */}
                  <div className="workspace-panel recording-panel" style={{ textAlign: 'center' }}>
                    <h2 className="panel-title">2. Speak & Record</h2>
                    <p className="panel-subtitle" style={{ marginBottom: '20px' }}>Activate the mic and read the target passage cleanly. The analysis evaluates speech targets.</p>
                    
                    <div className="recorder-container" style={{ minHeight: '260px' }}>
                      <div className={`status-badge ${status}`}>
                        {status === 'recording' && <span className="pulse-dot" style={{ width: '8px', height: '8px', backgroundColor: 'var(--error)', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }}></span>}
                        {statusMessage}
                      </div>

                      <div className="record-btn-wrapper" style={{ margin: '20px 0' }}>
                        {isRecording && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-8px',
                            right: '-8px',
                            bottom: '-8px',
                            borderRadius: '50%',
                            border: '2px solid var(--error)',
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                            opacity: 0.7,
                            pointerEvents: 'none'
                          }} />
                        )}
                        <button 
                          onClick={isRecording ? stopRecording : startRecording} 
                          className={`record-btn ${isRecording ? 'recording' : ''}`}
                          disabled={status === 'processing'}
                          style={{ border: 'none' }}
                        >
                          {isRecording ? <Square size={26} /> : <Mic size={26} />}
                        </button>
                      </div>

                      {/* Visualizer wave bars showing client speaking */}
                      {isRecording && (
                        <div className="visualizer-waves">
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                        </div>
                      )}

                      {liveTranscript && (
                        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Client Live Feed (Web Speech):</span>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{liveTranscript}...</p>
                        </div>
                      )}

                      {audioUrl && !isRecording && (
                        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Playback:</span>
                          <button
                            onClick={() => playUserRecording()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              padding: '6px 12px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'var(--transition-fast)'
                            }}
                          >
                            {isAudioPlaying && currentAudioType === 'recording' ? (
                              <Square size={14} style={{ color: 'var(--error)' }} />
                            ) : (
                              <Play size={14} style={{ color: 'var(--success)' }} />
                            )}
                            {isAudioPlaying && currentAudioType === 'recording' ? 'Stop' : 'Play My Recording'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Below: Results evaluation reports matching Module 1 / Module 2 */}
                
                {/* Module 1 type Result: Pronunciation scoring card */}
                {practiceResult && ["silent_pause_drill", "slow_rate_reading", "articulation_drill"].includes(activeExerciseDetail._id) && (
                  <div className="glass-card result-section" style={{ marginTop: '30px', textAlign: 'left' }}>
                    <h3 className="feedback-title" style={{ textAlign: 'center' }}>Pronunciation Accuracy Analysis</h3>
                    
                    <div className="result-grid">
                      <div className="score-panel">
                        <div className="score-circle">
                          <span className="score-val">{practiceResult.pronunciation_score}</span>
                          <span className="score-label">/ 10</span>
                        </div>
                        <h4 className="score-heading">Overall Score</h4>
                        <p className="score-desc">
                          Accuracy: {((1 - practiceResult.word_error_rate) * 100).toFixed(0)}% matching
                        </p>
                      </div>

                      <div className="feedback-panel">
                        <h4 className="feedback-title">Articulation & Word Alignment</h4>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                          Your spoken text was matched with the target words. Correct words are colored green, while mismatched/mispronounced words are colored red in the card above.
                        </p>
                        {practiceResult.mismatched_words.length > 0 ? (
                          <ul className="feedback-list">
                            {practiceResult.mismatched_words.map((w, idx) => (
                              <li className="feedback-item" key={idx}>
                                <span className="feedback-bullet">▸</span>
                                <span>
                                  At index {w.index + 1}: Expected <strong>"{w.expected}"</strong> but recorded <strong>"{w.spoken || '[omitted]'}"</strong>
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                            <CheckCircle size={18} /> Excellent clarity! You didn't make any phonetic mistakes.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Module 2 type Result: Fluency scoring card */}
                {analysisResult && !["silent_pause_drill", "slow_rate_reading", "articulation_drill"].includes(activeExerciseDetail._id) && (
                  <div className="glass-card result-section" style={{ marginTop: '30px', textAlign: 'left' }}>
                    <h3 className="feedback-title" style={{ textAlign: 'center' }}>Fluency & Clarity Analysis</h3>
                    
                    <div className="result-grid">
                      <div className="score-panel">
                        <div className="score-circle" style={{ borderColor: 'var(--secondary-light)', borderTopColor: 'var(--secondary)' }}>
                          <span className="score-val">{analysisResult.final_score}</span>
                          <span className="score-label">/ 10</span>
                        </div>
                        <h4 className="score-heading">Overall Fluency Score</h4>
                        <p className="score-desc">
                          Pacing: {analysisResult.wpm} WPM ({analysisResult.duration_sec.toFixed(1)}s)
                        </p>
                      </div>

                      <div className="feedback-panel">
                        <h4 className="feedback-title">Disfluency Markers</h4>
                        <ul className="feedback-list">
                          <li className="feedback-item">
                            <span className="feedback-bullet">▸</span>
                            <span>Filler words: <strong>{analysisResult.filler_count}</strong> {analysisResult.filler_words_found.length > 0 && `(${analysisResult.filler_words_found.join(', ')})`}</span>
                          </li>
                          <li className="feedback-item">
                            <span className="feedback-bullet">▸</span>
                            <span>Stammer / repetitions: <strong>{analysisResult.stammer_events}</strong> instances</span>
                          </li>
                          <li className="feedback-item">
                            <span className="feedback-bullet">▸</span>
                            <span>Long pauses (&gt;1.5s): <strong>{analysisResult.long_pauses}</strong> detected</span>
                          </li>
                          <li className="feedback-item">
                            <span className="feedback-bullet">▸</span>
                            <span>Speech rate: <strong>{analysisResult.wpm} WPM</strong> (Ideal: 120-150)</span>
                          </li>
                        </ul>

                        {analysisResult.pause_details && analysisResult.pause_details.length > 0 && (
                          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                            <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>⏱️ Detected Pause Locations:</h5>
                            
                            {/* Interactive Pause timeline bar */}
                            <div style={{ 
                              position: 'relative', 
                              height: '12px', 
                              backgroundColor: 'var(--bg-primary)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '6px', 
                              overflow: 'hidden', 
                              width: '100%', 
                              marginBottom: '8px' 
                            }}>
                              {analysisResult.pause_details.map((pause, idx) => {
                                const total = analysisResult.duration_sec || 1;
                                const leftPct = (pause.start / total) * 100;
                                const widthPct = (pause.duration / total) * 100;
                                return (
                                  <div 
                                    key={idx} 
                                    style={{ 
                                      position: 'absolute', 
                                      left: `${leftPct}%`, 
                                      width: `${widthPct}%`, 
                                      height: '100%', 
                                      backgroundColor: 'var(--error)',
                                      opacity: 0.8
                                    }}
                                    title={`Pause: ${pause.duration}s (from ${pause.start}s to ${pause.end}s)`}
                                  />
                                );
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                              <span>0.0s</span>
                              <span>{(analysisResult.duration_sec || 0).toFixed(1)}s</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {analysisResult.pause_details.map((pause, idx) => (
                                <span key={idx} style={{ fontSize: '11px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '4px' }}>
                                  {pause.duration}s gap at {pause.start}s
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI pathologist assessment feedback */}
                        {analysisResult.ai_pathologist_feedback && (
                          <div className="feedback-panel" style={{ marginTop: '16px', borderLeft: '4px solid var(--accent)', backgroundColor: 'rgba(99, 102, 241, 0.02)', padding: '12px 16px' }}>
                            <h4 className="feedback-title" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', margin: '0' }}>
                              <Sparkles size={14} /> AI Speech Pathologist Assessment
                            </h4>
                            <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', fontStyle: 'italic', margin: '6px 0 0' }}>
                              "{analysisResult.ai_pathologist_feedback}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="dashboard-hero" style={{ marginBottom: '24px' }}>
                  <h1 className="hero-title">Speech Therapy Drills & Exercises Library</h1>
                  <p className="hero-subtitle">Search exercises loaded directly from the database and practice specific pronunciation or speech rhythms.</p>
                </div>

                {/* Filter Search Bar */}
                <div style={{ display: 'flex', gap: '10px', maxWidth: '500px', margin: '0 auto 30px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '40px', width: '100%' }}
                      value={exerciseSearch}
                      onChange={e => setExerciseSearch(e.target.value)}
                      placeholder="Search by drill title, difficulty, or tags..."
                    />
                  </div>
                </div>

                {filteredExercises.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No speech drills match your search criteria. Try a different query!</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', textAlign: 'left' }}>
                    {filteredExercises.map((ex, idx) => (
                      <div key={idx} className="glass-card exercise-library-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `4px solid ${ex.difficulty === 'beginner' ? 'var(--success)' : ex.difficulty === 'intermediate' ? 'var(--warning)' : 'var(--error)'}` }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{ex.title}</h4>
                            <span style={{ 
                              fontSize: '10px', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              fontWeight: 'bold',
                              backgroundColor: ex.difficulty === 'beginner' ? 'rgba(16, 185, 129, 0.1)' : ex.difficulty === 'intermediate' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                              color: ex.difficulty === 'beginner' ? 'var(--success)' : ex.difficulty === 'intermediate' ? 'var(--warning)' : 'var(--error)'
                            }}>
                              {ex.difficulty}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>{ex.description}</p>
                          
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                            <code>Triggers on: {ex.trigger_condition}</code>
                          </div>
                        </div>

                        <button 
                          onClick={() => startExerciseDrill(ex)}
                          className="submit-btn" 
                          style={{ fontSize: '13px', padding: '8px', fontWeight: 'bold', marginTop: '0', boxShadow: 'none' }}
                        >
                          Start Drill
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 5. MODULE 3: VIDEO & COMMUNICATION ANALYSIS */}
        {activeTab === 'video' && (
          <div className="view-fade">
            <VideoAnalysisModule currentUser={currentUser} />
          </div>
        )}
      </main>

      {/* User Registration/Login Overlay Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                {authMode === 'login' ? 'Sign In to SpeechAI' : 'Create SpeechAI Account'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {authError && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--error-light)', border: '1px solid var(--error)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: '13px', marginBottom: '18px', textAlign: 'left' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your name" 
                    value={authName} 
                    onChange={e => setAuthName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@example.com" 
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>

            <span className="auth-toggle-link" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(null); }}>
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
