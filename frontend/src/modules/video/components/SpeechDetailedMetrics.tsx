import React from 'react';
import type { SpeechFeatures } from '../types';
import { Mic, Activity, AlignLeft, Clock, BarChart2 } from 'lucide-react';

interface SpeechDetailedMetricsProps {
  speech: SpeechFeatures;
  durationSec: number;
}

export const SpeechDetailedMetrics: React.FC<SpeechDetailedMetricsProps> = ({ speech, durationSec }) => {
  const durationMin = durationSec / 60;
  const wordCount = speech.word_count || 1; // avoid div by zero

  // Scientific Formulas (as approved in plan)
  // 1. Filler Score (out of 10)
  const fillerPer100 = (speech.filler_count / wordCount) * 100;
  const fillerScoreRaw = 10 - Math.min(10, fillerPer100 * 1.5);
  const fillerScore = Math.max(0, fillerScoreRaw).toFixed(1);

  // 2. Stammer Score (out of 10)
  const stammerPer100 = (speech.repetition_count / wordCount) * 100;
  const stammerScoreRaw = 10 - Math.min(10, stammerPer100 * 2.5);
  const stammerScore = Math.max(0, stammerScoreRaw).toFixed(1);

  // 3. Pause Score (out of 10)
  const pausesPerMin = durationMin > 0 ? speech.long_pauses / durationMin : 0;
  const pauseScoreRaw = 10 - Math.min(10, pausesPerMin * 1.5);
  const pauseScore = Math.max(0, pauseScoreRaw).toFixed(1);

  // 4. Rate Score (out of 10)
  const rateScoreRaw = 10 - Math.min(10, Math.abs(speech.wpm - 145) / 15);
  const rateScore = Math.max(0, rateScoreRaw).toFixed(1);

  // 5. Pronunciation Accuracy / Clarity (out of 10)
  // clarity_raw is Whisper's logprob (usually -1 to 0)
  const pronunciationScoreRaw = 10 + (speech.clarity_raw * 10);
  const pronunciationScore = Math.max(0, Math.min(10, pronunciationScoreRaw));
  
  // 6. Word Error Rate (WER) %
  const wer = Math.max(0, (10 - pronunciationScore) * 10).toFixed(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        Detailed Speech Analytics (Module 1 & 2 Factors)
      </h3>
      
      {/* Top Raw Metrics Grid */}
      <div className="vid-subscores-grid">
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Activity size={18} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>WPM Rate</span>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800 }}>{speech.wpm.toFixed(1)} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>WPM</span></span>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)' }}>
            <AlignLeft size={18} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Filler Words</span>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800 }}>{speech.filler_count}</span>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
            <Mic size={18} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Stammers</span>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800 }}>{speech.repetition_count}</span>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
            <Clock size={18} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Long Pauses</span>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800 }}>{speech.long_pauses}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Scored Metrics Card */}
        <div className="glass-card">
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} /> Diagnostic Scores
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Filler Score</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fillerScore}/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Stammer Score</span>
              <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{stammerScore}/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Pause Score</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pauseScore}/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Rate Score</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>{rateScore}/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-primary)' }}>Clarity Score</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{pronunciationScore.toFixed(1)}/10</span>
            </div>
          </div>
        </div>

        {/* Pronunciation Metrics Card */}
        <div className="glass-card">
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Pronunciation Accuracy Metrics
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>{pronunciationScore.toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/10</span></div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Word Error Rate (WER)</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--error)' }}>{wer}%</div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            * Note: WER and Pronunciation scores are statistically estimated derived from acoustic confidence logs and raw clarity metrics.
          </p>
        </div>
      </div>
    </div>
  );
};
