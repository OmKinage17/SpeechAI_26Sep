import React from 'react';
import { Loader2, CheckCircle2, Music, Video, Sparkles, BarChart3, UploadCloud } from 'lucide-react';

interface ProcessingViewProps {
  stage: string;
}

const STAGES = [
  { id: 'uploading', label: 'Uploading Session Video', icon: UploadCloud },
  { id: 'extracting_audio', label: 'Audio Stream Extraction (16 kHz WAV)', icon: Music },
  { id: 'transcribing', label: 'Whisper ASR Speech Recognition & Timestamps', icon: Sparkles },
  { id: 'video_analysis', label: 'MediaPipe Face Mesh, Gaze & Posture Analysis', icon: Video },
  { id: 'scoring', label: '5-Second Multimodal Fusion & Clinical Scoring', icon: BarChart3 }
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({ stage }) => {
  const getStageIndex = (currentStage: string) => {
    switch (currentStage) {
      case 'uploading':
      case 'queued':
        return 0;
      case 'extracting_audio':
        return 1;
      case 'transcribing':
        return 2;
      case 'video_analysis':
        return 3;
      case 'scoring':
        return 4;
      case 'done':
        return 5;
      default:
        return 1;
    }
  };

  const currentIndex = getStageIndex(stage);

  return (
    <div className="glass-card vid-processing-card">
      <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--primary-light)', marginBottom: '16px' }}>
        <Loader2 size={36} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
        Analyzing Speech & Body Language
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        Extracting multimodal features across audio and visual layers...
      </p>

      <div className="vid-stage-steps">
        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={s.id}
              className={`vid-stage-item ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
            >
              {isDone ? (
                <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              ) : isCurrent ? (
                <Loader2 size={20} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite', flexShrink: 0 }} />
              ) : (
                <Icon size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1 }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
