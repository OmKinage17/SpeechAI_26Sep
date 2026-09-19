import React, { useState, useEffect, useRef } from 'react';
import { Square, RotateCcw, Send, Sparkles, Clock, MessageSquare, Video } from 'lucide-react';

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

const DEFAULT_PROMPTS: Record<string, string[]> = {
  free_talk: [
    "Describe your favorite hobby or a passion project you enjoy working on, focusing on calm pacing and steady eye contact.",
    "Share an inspiring story or experience that taught you a valuable life lesson.",
    "Discuss how modern technology has impacted the way we connect with friends and family."
  ],
  interview: [
    "Tell me about yourself and walk me through a professional challenge you successfully overcame.",
    "How do you handle high-pressure deadlines while maintaining clear communication with your team?",
    "Where do you see yourself in three years, and what speech habits are you actively developing?"
  ],
  presentation: [
    "Introduce a revolutionary product idea in 60 seconds, maintaining confident posture and natural vocal inflection.",
    "Present a summary of the SpeechAI Multimodal platform and explain why non-verbal signals matter in speech therapy.",
    "Explain an interesting scientific concept to a general audience using clear articulation and structured pauses."
  ]
};

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
  const [taskType, setTaskType] = useState<'free_talk' | 'interview' | 'presentation'>('free_talk');
  const [promptIndex, setPromptIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach live camera feed
  useEffect(() => {
    if (liveVideoRef.current && stream && !recordedUrl) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream, recordedUrl]);

  // Handle countdown before recording starts
  const triggerStartWithCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      onStartRecord();
    }
  }, [countdown, onStartRecord]);

  const activePrompt = DEFAULT_PROMPTS[taskType][promptIndex % DEFAULT_PROMPTS[taskType].length];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top: Task Mode Selector */}
      {!recordedUrl && (
        <div className="vid-task-selector">
          <div
            className={`vid-task-option ${taskType === 'free_talk' ? 'active' : ''}`}
            onClick={() => { setTaskType('free_talk'); setPromptIndex(0); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Free Talk</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target: 120-150 WPM (Conversational)</p>
          </div>

          <div
            className={`vid-task-option ${taskType === 'interview' ? 'active' : ''}`}
            onClick={() => { setTaskType('interview'); setPromptIndex(0); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Clock size={16} style={{ color: 'var(--secondary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Interview Answer</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target: 110-140 WPM (Deliberate)</p>
          </div>

          <div
            className={`vid-task-option ${taskType === 'presentation' ? 'active' : ''}`}
            onClick={() => { setTaskType('presentation'); setPromptIndex(0); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Presentation</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target: 125-155 WPM (Engaging)</p>
          </div>
        </div>
      )}

      {/* Suggested Prompt Card */}
      {!recordedUrl && (
        <div className="vid-prompt-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secondary)', fontWeight: 700 }}>
              Practice Topic & Speaking Prompt
            </span>
            <p style={{ marginTop: '4px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
              "{activePrompt}"
            </p>
          </div>
          <button
            className="vid-btn-secondary"
            onClick={() => setPromptIndex(prev => prev + 1)}
            style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
          >
            New Prompt
          </button>
        </div>
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
              <video ref={liveVideoRef} autoPlay playsInline muted className="vid-camera-video" />
              
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
                  animation: 'pulse-glow 1s infinite'
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
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.6)'
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
                  gap: '12px'
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
              <button className="vid-btn-secondary" onClick={onRetake}>
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
