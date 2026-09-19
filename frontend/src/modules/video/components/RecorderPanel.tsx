import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Square, 
  RotateCcw, 
  Send, 
  Sparkles, 
  Clock, 
  MessageSquare, 
  Video, 
  Volume2, 
  VolumeX, 
  FileText, 
  Edit3, 
  Check, 
  RefreshCw 
} from 'lucide-react';

interface RecorderPanelProps {
  stream: MediaStream | null;
  isRecording: boolean;
  recordingTime: number;
  recordedUrl: string | null;
  micLevel: number;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onRetake: () => void;
  onSubmit: (taskType: string, promptText: string) => void;
}

const DEFAULT_PROMPTS = {
  free_talk: [
    "Describe your favorite hobby or a passion project you enjoy working on, focusing on calm pacing and steady eye contact.",
    "Share an inspiring story or personal experience that taught you a valuable life lesson.",
    "Discuss how modern technology has impacted the way we connect with friends, colleagues, and family.",
    "Describe a place you love visiting and explain what makes it so special to you."
  ],
  interview: [
    "Tell me about yourself and walk me through a professional challenge you successfully overcame.",
    "How do you handle high-pressure deadlines while maintaining clear communication with your team?",
    "Where do you see yourself in three years, and what speech habits are you actively developing?",
    "Describe a situation where you had a disagreement with a team member and how you resolved it professionally.",
    "What is your greatest strength, and how do you leverage it when communicating complex ideas?",
    "Why do you believe confident body language and steady eye contact are critical for effective leadership?",
    "Can you share an experience where you had to adapt quickly to unexpected project changes?",
    "How do you prioritize competing tasks when multiple stakeholders consider their requests urgent?"
  ]
};

const QUICK_TOPICS = [
  "Artificial Intelligence",
  "Space Exploration",
  "Leadership & Teamwork",
  "Climate Action",
  "Healthy Daily Habits",
  "Future of Remote Work"
];

export const RecorderPanel: React.FC<RecorderPanelProps> = ({
  stream,
  isRecording,
  recordingTime,
  recordedUrl,
  micLevel,
  onStartRecord,
  onStopRecord,
  onRetake,
  onSubmit
}) => {
  const [taskType, setTaskType] = useState<'free_talk' | 'interview' | 'custom_topic'>('free_talk');
  const [promptIndex, setPromptIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Audio Question Reader (SpeechSynthesis) state for Interview mode
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [autoReadQuestion, setAutoReadQuestion] = useState(false);
  const [spokenCharIndex, setSpokenCharIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Custom Topic Paragraph Generator state
  const [aiTopic, setAiTopic] = useState('Artificial Intelligence');
  const [aiLength, setAiLength] = useState<'sentence' | 'paragraph' | 'long_paragraph'>('paragraph');
  const [aiFocusExercise, setAiFocusExercise] = useState('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedParagraph, setGeneratedParagraph] = useState(
    "Effective communication is a powerful skill that combines steady vocal pacing, clear articulation, and natural body language. When you speak with calm confidence and maintain steady eye contact, your listeners are far more engaged and receptive to your core ideas."
  );
  const [isEditingParagraph, setIsEditingParagraph] = useState(false);
  const [editedParagraph, setEditedParagraph] = useState(generatedParagraph);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Active prompt for standard modes
  const activePrompt = taskType === 'custom_topic'
    ? (isEditingParagraph ? editedParagraph : generatedParagraph)
    : DEFAULT_PROMPTS[taskType][promptIndex % DEFAULT_PROMPTS[taskType].length];

  // Stop TTS speech
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    setSpokenCharIndex(0);
  }, []);

  // Speak Interview question aloud
  const speakQuestion = useCallback((textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance; // Prevent garbage collection
    utterance.rate = 0.93; // Measured, natural interview tone
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsSpeakingQuestion(true);
      setSpokenCharIndex(0);
    };
    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        setSpokenCharIndex(e.charIndex);
      }
    };
    utterance.onend = () => {
      setIsSpeakingQuestion(false);
      setSpokenCharIndex(0);
    };
    utterance.onerror = () => {
      setIsSpeakingQuestion(false);
      setSpokenCharIndex(0);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Cleanup audio on unmount or tab switch
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Auto-read question when interview question changes
  useEffect(() => {
    if (taskType === 'interview' && autoReadQuestion && !recordedUrl && !isRecording) {
      const q = DEFAULT_PROMPTS.interview[promptIndex % DEFAULT_PROMPTS.interview.length];
      speakQuestion(q);
    } else {
      stopSpeaking();
    }
  }, [taskType, promptIndex, autoReadQuestion, recordedUrl, isRecording, speakQuestion, stopSpeaking]);

  // Keep live camera attached and playing
  useEffect(() => {
    if (liveVideoRef.current && stream && !recordedUrl) {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [stream, recordedUrl]);

  // Handle countdown before recording starts
  const triggerStartWithCountdown = () => {
    stopSpeaking();
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      stopSpeaking();
      onStartRecord();
    }
  }, [countdown, onStartRecord, stopSpeaking]);

  // Topic Paragraph Generation Handler (same backend API as Module 1 & Module 2)
  const handleGenerateParagraph = async (overrideTopic?: string) => {
    const topicParam = overrideTopic || aiTopic || 'General Communication';
    setIsGenerating(true);
    try {
      const url = `http://127.0.0.1:8000/practice/generate?topic=${encodeURIComponent(topicParam)}&length=${aiLength}&exercise_id=${aiFocusExercise}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGeneratedParagraph(data.text);
        setEditedParagraph(data.text);
        setIsEditingParagraph(false);
      } else {
        throw new Error('Failed to generate paragraph');
      }
    } catch (e) {
      console.error(e);
      const fallbackText = "Speaking in front of an audience can be intimidating at first, but with steady pacing and deliberate breaths, anyone can deliver a powerful message. Focus on articulation and maintain a conversational speed of around one hundred and thirty words per minute.";
      setGeneratedParagraph(fallbackText);
      setEditedParagraph(fallbackText);
    } finally {
      setIsGenerating(false);
    }
  };

  // Retake click handler
  const handleRetakeClick = async () => {
    setCountdown(null);
    stopSpeaking();
    if (reviewVideoRef.current) {
      reviewVideoRef.current.pause();
      reviewVideoRef.current.removeAttribute('src');
      reviewVideoRef.current.load();
    }
    await onRetake();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const wordCount = activePrompt.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / 130) * 60);

  // --- NEW: User Speech Tracking for Teleprompter Effect ---
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording) {
      setLiveTranscript('');
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
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

        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("SpeechRecognition start error:", e);
        }
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setLiveTranscript('');
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isRecording]);

  const getLiveWordColorClass = (index: number, currentTarget: string): string => {
    if (!liveTranscript || !isRecording) {
      return isRecording && index === 0 ? 'practice-word current' : 'practice-word default';
    }

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

  const renderHighlightedText = (text: string) => {
    const displayWords = text.split(/\s+/);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {displayWords.map((word, index) => (
          <span key={index} className={getLiveWordColorClass(index, text)}>
            {word}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top: Task Mode Selector */}
      {!recordedUrl && (
        <div className="vid-task-selector">
          {/* 1. Free Talk */}
          <div
            className={`vid-task-option ${taskType === 'free_talk' ? 'active' : ''}`}
            onClick={() => { setTaskType('free_talk'); setPromptIndex(0); stopSpeaking(); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Free Talk</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conversational prompts (120-150 WPM)</p>
          </div>

          {/* 2. Interactive Interview Answer */}
          <div
            className={`vid-task-option ${taskType === 'interview' ? 'active' : ''}`}
            onClick={() => { setTaskType('interview'); setPromptIndex(0); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Clock size={16} style={{ color: 'var(--secondary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Interview Answer</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI Interviewer speaks questions (110-140 WPM)</p>
          </div>

          {/* 3. Custom Topic Paragraph Generation (Replacing Presentation) */}
          <div
            className={`vid-task-option ${taskType === 'custom_topic' ? 'active' : ''}`}
            onClick={() => { setTaskType('custom_topic'); stopSpeaking(); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Custom Topic AI</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generate reading passages on any topic</p>
          </div>
        </div>
      )}

      {/* Task Prompt Area */}
      {!recordedUrl && (
        <>
          {/* CASE 1: Free Talk Prompt */}
          {taskType === 'free_talk' && (
            <div className="vid-prompt-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secondary)', fontWeight: 700 }}>
                  Practice Topic & Conversational Prompt
                </span>
                <p style={{ marginTop: '4px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  "{activePrompt}"
                </p>
              </div>
              <button
                className="vid-btn-secondary"
                onClick={() => setPromptIndex(prev => prev + 1)}
                style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
              >
                Next Prompt
              </button>
            </div>
          )}

          {/* CASE 2: Interactive AI Interviewer Box */}
          {taskType === 'interview' && (
            <div className="vid-interview-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700 }}>
                    AI Mock Interviewer • Question {(promptIndex % DEFAULT_PROMPTS.interview.length) + 1} of {DEFAULT_PROMPTS.interview.length}
                  </span>
                  {isSpeakingQuestion && (
                    <div className="vid-speaker-pill">
                      <div className="vid-speaker-wave">
                        <div className="vid-wave-bar" />
                        <div className="vid-wave-bar" />
                        <div className="vid-wave-bar" />
                        <div className="vid-wave-bar" />
                      </div>
                      <span>Speaking Question...</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoReadQuestion}
                      onChange={(e) => setAutoReadQuestion(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Auto-read questions
                  </label>
                </div>
              </div>

              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                "{activePrompt}"
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {isSpeakingQuestion ? (
                    <button
                      className="vid-btn-secondary"
                      onClick={stopSpeaking}
                      style={{ padding: '6px 14px', fontSize: '12px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                    >
                      <VolumeX size={14} /> Stop Audio
                    </button>
                  ) : (
                    <button
                      className="vid-btn-secondary"
                      onClick={() => speakQuestion(activePrompt)}
                      style={{ padding: '6px 14px', fontSize: '12px', borderColor: 'rgba(99, 102, 241, 0.4)', color: 'var(--primary)' }}
                    >
                      <Volume2 size={14} /> Read Aloud
                    </button>
                  )}
                </div>

                <button
                  className="vid-btn-secondary"
                  onClick={() => {
                    stopSpeaking();
                    setPromptIndex(prev => prev + 1);
                  }}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Next Question
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: Custom Topic & Paragraph Generator (similar to Module 1 & 2) */}
          {taskType === 'custom_topic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Generator Configuration Controls */}
              <div className="vid-topic-generator">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      AI Practice Paragraph Generator
                    </span>
                  </div>
                </div>

                {/* Quick Topic Chips */}
                <div className="vid-quick-chips">
                  {QUICK_TOPICS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      className={`vid-chip-btn ${aiTopic === topic ? 'active' : ''}`}
                      onClick={() => {
                        setAiTopic(topic);
                        handleGenerateParagraph(topic);
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                {/* Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Topic Keyword
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: '13px', width: '100%' }}
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. Artificial Intelligence, Climate, Leadership..."
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Length
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px'
                      }}
                      value={aiLength}
                      onChange={(e) => setAiLength(e.target.value as 'sentence' | 'paragraph' | 'long_paragraph')}
                    >
                      <option value="sentence">Sentence</option>
                      <option value="paragraph">Paragraph</option>
                      <option value="long_paragraph">Long Paragraph</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Focus Drill
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px'
                      }}
                      value={aiFocusExercise}
                      onChange={(e) => setAiFocusExercise(e.target.value)}
                    >
                      <option value="none">Standard Pacing</option>
                      <option value="silent_pause_drill">Silent Pause Focus</option>
                      <option value="slow_rate_reading">Slow Rate Reading</option>
                      <option value="articulation_drill">Articulation Drill</option>
                    </select>
                  </div>

                  <button
                    className="vid-btn-primary"
                    type="button"
                    onClick={() => handleGenerateParagraph()}
                    disabled={isGenerating}
                    style={{ padding: '8px 18px', fontSize: '13px', whiteSpace: 'nowrap' }}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={14} className="spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Teleprompter Reading Card */}
              <div className="vid-teleprompter-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={15} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      Reading Script Teleprompter
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      {wordCount} words • ~{estimatedSeconds}s reading
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Read Aloud feature for Custom Topic */}
                    {isSpeakingQuestion ? (
                      <div className="vid-speaker-pill" style={{ marginRight: '8px', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.15)' }}>
                        <div className="vid-speaker-wave">
                          <div className="vid-wave-bar" />
                          <div className="vid-wave-bar" />
                          <div className="vid-wave-bar" />
                          <div className="vid-wave-bar" />
                        </div>
                        <span style={{ color: '#f87171' }}>Speaking...</span>
                      </div>
                    ) : null}

                    {isSpeakingQuestion ? (
                      <button
                        className="vid-btn-secondary"
                        onClick={stopSpeaking}
                        style={{ padding: '4px 10px', fontSize: '11.5px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      >
                        <VolumeX size={12} /> Stop Audio
                      </button>
                    ) : (
                      <button
                        className="vid-btn-secondary"
                        onClick={() => speakQuestion(activePrompt)}
                        style={{ padding: '4px 10px', fontSize: '11.5px', color: 'var(--primary)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                      >
                        <Volume2 size={12} /> Read Aloud
                      </button>
                    )}

                    {isEditingParagraph ? (
                      <button
                        className="vid-btn-secondary"
                        onClick={() => {
                          setGeneratedParagraph(editedParagraph);
                          setIsEditingParagraph(false);
                        }}
                        style={{ padding: '4px 10px', fontSize: '11.5px', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.4)' }}
                      >
                        <Check size={12} /> Save Script
                      </button>
                    ) : (
                      <button
                        className="vid-btn-secondary"
                        onClick={() => {
                          setEditedParagraph(generatedParagraph);
                          setIsEditingParagraph(true);
                        }}
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                      >
                        <Edit3 size={12} /> Edit Script
                      </button>
                    )}
                  </div>
                </div>

                {isEditingParagraph ? (
                  <textarea
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '14.5px',
                      lineHeight: 1.6,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    value={editedParagraph}
                    onChange={(e) => setEditedParagraph(e.target.value)}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 500, letterSpacing: '0.2px', lineHeight: 1.6 }}>
                    {renderHighlightedText(generatedParagraph)}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Video Stage Area */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <div className="vid-camera-box" style={{ width: '100%', aspectRatio: '16 / 9' }}>
          {recordedUrl ? (
            /* Review Playback Mode */
            <video
              ref={reviewVideoRef}
              src={recordedUrl}
              controls
              playsInline
              className="vid-camera-video"
              style={{ transform: 'none' }}
            />
          ) : (
            /* Live Recording View */
            <>
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="vid-camera-video"
              />

              {/* 3-2-1 Countdown Overlay */}
              {countdown !== null && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(10, 14, 26, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '80px',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  animation: 'pulse-glow 1s infinite',
                  zIndex: 20
                }}>
                  {countdown}
                </div>
              )}

              {/* Active Recording Pill Indicator */}
              {isRecording && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.9)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.6)',
                  zIndex: 10
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse-border 1s infinite' }} />
                  <span>REC {formatTime(recordingTime)}</span>
                </div>
              )}

              {/* Live Mic Level during recording */}
              {isRecording && (
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  background: 'rgba(10, 14, 26, 0.75)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 10
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>MIC</span>
                  <div className="vid-meter-bar-bg" style={{ flex: 1, height: '6px' }}>
                    <div className="vid-meter-bar-fill" style={{ width: `${micLevel}%` }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px' }}>
          {recordedUrl ? (
            <>
              <button className="vid-btn-secondary" onClick={handleRetakeClick}>
                <RotateCcw size={16} /> Retake Video
              </button>
              <button className="vid-btn-primary" onClick={() => onSubmit(taskType, activePrompt)}>
                <Send size={16} /> Submit for Analysis
              </button>
            </>
          ) : isRecording ? (
            <button className="vid-btn-danger" onClick={onStopRecord}>
              <Square size={18} fill="#fff" /> Stop Recording ({formatTime(recordingTime)})
            </button>
          ) : (
            <button
              className="vid-btn-primary"
              onClick={triggerStartWithCountdown}
              disabled={countdown !== null}
            >
              <Video size={18} /> Start Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
