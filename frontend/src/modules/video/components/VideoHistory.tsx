import React from 'react';
import type { VideoSessionDetail } from '../types';
import { Video, Trash2, Calendar, ChevronRight } from 'lucide-react';

interface VideoHistoryProps {
  sessions: VideoSessionDetail[];
  onSelectSession: (session: VideoSessionDetail) => void;
  onDeleteSession: (jobId: string) => void;
}

export const VideoHistory: React.FC<VideoHistoryProps> = ({
  sessions,
  onSelectSession,
  onDeleteSession
}) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
        <Video size={48} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          No Video Sessions Yet
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
          Record your first video speech session to begin tracking non-verbal composure and vocal rhythm over time.
        </p>
      </div>
    );
  }

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Past Multimodal Sessions ({sessions.length})
        </h3>
      </div>

      {sessions.map((s) => {
        const score10 = s.scores?.overall_10 ?? 0;
        const wpm = s.speech?.wpm ?? 0;
        const gaze = Math.round((s.visual?.camera_facing_ratio ?? 0) * 100);

        return (
          <div
            key={s.id}
            className="history-log-item"
            style={{ cursor: 'pointer', transition: 'var(--transition-fast)' }}
            onClick={() => onSelectSession(s)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                color: 'var(--text-primary)',
                flexShrink: 0
              }}>
                {score10.toFixed(1)}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {s.task_type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {Math.round(s.duration_sec)}s
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {formatDate(s.created_at)}
                  </span>
                  <span>•</span>
                  <span>{wpm} WPM</span>
                  <span>•</span>
                  <span>{gaze}% Gaze</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
              <button
                className="nav-link"
                onClick={() => onDeleteSession(s.id)}
                style={{ color: 'var(--text-muted)', padding: '6px' }}
                title="Delete session"
              >
                <Trash2 size={16} />
              </button>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
