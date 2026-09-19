import React from 'react';
import { Smile, Info } from 'lucide-react';

interface EmotionBreakdownProps {
  distribution: Record<string, number>;
  dominantEmotion: string;
}

export const EmotionBreakdown: React.FC<EmotionBreakdownProps> = ({
  distribution,
  dominantEmotion
}) => {
  const entries = Object.entries(distribution || {});

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Smile size={18} style={{ color: 'var(--success)' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Facial Composure & Expression Dynamics
        </h3>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Dominant expression: <strong style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{dominantEmotion}</strong>
      </p>

      {/* Distribution Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map(([emotion, ratio]) => {
          const pct = Math.round(ratio * 100);
          return (
            <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '80px', fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                {emotion}
              </span>
              <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: emotion === 'neutral' ? 'var(--primary)' : emotion === 'happy' ? 'var(--success)' : 'var(--warning)',
                    borderRadius: 'var(--radius-full)'
                  }}
                />
              </div>
              <span style={{ width: '35px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Clinical Disclaimer */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '6px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
        <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          <strong>Clinical note:</strong> Facial expressions are measured as surface visual proxies to help detect tension blocks. Resting faces can sometimes appear neutral or serious.
        </span>
      </div>
    </div>
  );
};
