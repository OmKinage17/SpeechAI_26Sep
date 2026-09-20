import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Square, 
  RotateCcw, 
  Send, 
  Video, 
  Volume2, 
  VolumeX, 
  Bot,
  User,
  MessageSquare
} from 'lucide-react';

interface RecorderPanelProps {
  stream: MediaStream | null;
  taskConfig: {
    taskType: 'free_talk' | 'interview' | 'custom_topic';
    customParagraph?: string;
  };
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
    "Describe a situation where you had a disagreement with a team member and how you resolved it professionally."
  ]
};

export const RecorderPanel: React.FC<RecorderPanelProps> = ({
  stream,
  taskConfig,
  isRecording,
  recordingTime,
  recordedUrl,
  micLevel,
  onStartRecord,
  onStopRecord,
  onRetake,
  onSubmit
}) => {
  const [promptIndex, setPromptIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Audio Question Reader (SpeechSynthesis) state
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [spokenCharIndex, setSpokenCharIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);

  const activePrompt = taskConfig.taskType === 'custom_topic'
    ? (taskConfig.customParagraph || "")
    : DEFAULT_PROMPTS[taskConfig.taskType][promptIndex % DEFAULT_PROMPTS[taskConfig.taskType].length];

  // Stop TTS speech
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingQuestion(false);
    setSpokenCharIndex(0);
  }, []);

  // Speak prompt aloud
  const speakQuestion = useCallback((textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance; 
    utterance.rate = 0.93;
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
    return () => stopSpeaking();
  }, [stopSpeaking]);

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

  // User Speech Tracking for Teleprompter Effect
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
      if (recordedUrl && liveTranscript.length === 0) {
        // If recording finishes but there's no transcript
      } else if (!recordedUrl) {
         setLiveTranscript('');
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isRecording, recordedUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 4-Quadrant Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '16px',
        width: '100%',
        minHeight: '600px'
      }}>
        
        {/* Top-Left: AI Robot Avatar */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Bot size={16} color="var(--primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>AI Interviewer</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', position: 'relative' }}>
             {/* Simple Placeholder for AI Video */}
             <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: isSpeakingQuestion ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: isSpeakingQuestion ? '0 0 40px var(--primary)' : 'none'
             }}>
                <Bot size={64} color={isSpeakingQuestion ? '#fff' : 'var(--text-muted)'} />
             </div>
             {isSpeakingQuestion && (
                <div style={{ position: 'absolute', bottom: '16px', background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                   Speaking...
                </div>
             )}
          </div>
        </div>

        {/* Top-Right: AI Speaking Text (Prompt/Question) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>AI Script / Question</span>
            </div>
            
            {!recordedUrl && !isRecording && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {isSpeakingQuestion ? (
                  <button className="vid-btn-secondary" onClick={stopSpeaking} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    <VolumeX size={14} /> Stop
                  </button>
                ) : (
                  <button className="vid-btn-secondary" onClick={() => speakQuestion(activePrompt)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    <Volume2 size={14} /> Read Aloud
                  </button>
                )}
                
                {taskConfig.taskType !== 'custom_topic' && (
                  <button className="vid-btn-secondary" onClick={() => setPromptIndex(prev => prev + 1)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto', fontSize: '18px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {activePrompt}
          </div>
        </div>

        {/* Bottom-Left: User Webcam Video */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <User size={16} color="var(--secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Your Camera</span>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {recordedUrl ? (
              <video ref={reviewVideoRef} src={recordedUrl} controls playsInline className="vid-camera-video" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <video ref={liveVideoRef} autoPlay playsInline muted className="vid-camera-video" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* 3-2-1 Countdown Overlay */}
                {countdown !== null && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(10, 14, 26, 0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '80px', fontWeight: 900, color: 'var(--primary)', zIndex: 20
                  }}>
                    {countdown}
                  </div>
                )}

                {/* Active Recording Pill Indicator */}
                {isRecording && (
                  <div style={{
                    position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(239, 68, 68, 0.9)', padding: '6px 14px', borderRadius: 'var(--radius-full)',
                    color: '#fff', fontWeight: 700, fontSize: '13px', zIndex: 10
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse-border 1s infinite' }} />
                    <span>REC {formatTime(recordingTime)}</span>
                  </div>
                )}

                {/* Mic Level */}
                {isRecording && (
                  <div style={{
                    position: 'absolute', bottom: '16px', left: '16px', right: '16px', background: 'rgba(10, 14, 26, 0.75)',
                    padding: '8px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10
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
        </div>

        {/* Bottom-Right: Live User Transcript or Teleprompter */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <MessageSquare size={16} color="var(--secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {taskConfig.taskType === 'custom_topic' ? 'Reading Text' : 'Live Transcript'}
            </span>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto', fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: (taskConfig.taskType === 'custom_topic' || liveTranscript) ? 'normal' : 'italic' }}>
            {taskConfig.taskType === 'custom_topic' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {activePrompt.split(/\s+/).map((word, index) => {
                  const getLiveWordColor = (idx: number) => {
                    if (!liveTranscript) return idx === 0 ? { color: '#3b82f6', fontWeight: 'bold' } : { color: 'var(--text-primary)', fontWeight: 'normal' };
                    
                    const targetWords = activePrompt.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
                    const liveWords = liveTranscript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
                    
                    if (liveWords.length === 0) return idx === 0 ? { color: '#3b82f6', fontWeight: 'bold' } : { color: 'var(--text-primary)', fontWeight: 'normal' };
                    
                    let liveIdx = 0;
                    let wordStatus: 'correct' | 'incorrect' | 'default' | 'current' = 'default';
                    
                    for (let tIdx = 0; tIdx <= idx; tIdx++) {
                      if (tIdx >= targetWords.length) break;
                      if (liveIdx >= liveWords.length) {
                        if (tIdx === idx) wordStatus = 'current';
                        break;
                      }
                      
                      const tWord = targetWords[tIdx];
                      const lWord = liveWords[liveIdx];
                      
                      if (tWord === lWord || tWord.includes(lWord)) {
                        if (tIdx === idx) wordStatus = 'correct';
                        liveIdx++;
                      } else {
                        const nextTWord = tIdx + 1 < targetWords.length ? targetWords[tIdx + 1] : '';
                        if (nextTWord === lWord || nextTWord.includes(lWord)) {
                          if (tIdx === idx) wordStatus = 'incorrect';
                        } else {
                          if (tIdx === idx) wordStatus = 'incorrect';
                          liveIdx++;
                        }
                      }
                    }
                    
                    if (wordStatus === 'correct') return { color: '#22c55e', fontWeight: 'normal' };
                    if (wordStatus === 'incorrect') return { color: '#ef4444', fontWeight: 'normal' };
                    if (wordStatus === 'current') return { color: '#3b82f6', fontWeight: 'bold' };
                    return { color: 'var(--text-primary)', fontWeight: 'normal' };
                  };
                  
                  const style = getLiveWordColor(index);
                  return (
                    <span key={index} style={{ color: style.color, fontWeight: style.fontWeight, transition: 'color 0.2s' }}>
                      {word}{' '}
                    </span>
                  );
                })}
              </div>
            ) : (
              liveTranscript ? liveTranscript : (isRecording ? "Listening..." : "Your speech will appear here while recording.")
            )}
          </div>
        </div>

      </div>

      {/* Action Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
        {recordedUrl ? (
          <>
            <button className="vid-btn-secondary" onClick={handleRetakeClick}>
              <RotateCcw size={16} /> Retake Video
            </button>
            <button className="vid-btn-primary" onClick={() => onSubmit(taskConfig.taskType, activePrompt)}>
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
  );
};
