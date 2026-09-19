import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { ScoresBreakdown } from '../types';
import { Award, Zap, Eye, Smile, Activity } from 'lucide-react';

interface ScoreOverviewProps {
  scores: ScoresBreakdown;
  durationSec: number;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ scores, durationSec }) => {
  const radarData = [
    { subject: 'Fluency', score: scores.F ?? 0, fullMark: 100 },
    { subject: 'Clarity', score: scores.P ?? 0, fullMark: 100 },
    { subject: 'Non-Verbal', score: scores.N ?? 0, fullMark: 100 },
    { subject: 'Emotion', score: scores.E ?? 0, fullMark: 100 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner: Overall Score & Radar Overview */}
      <div className="vid-results-grid">
        {/* Left: Overall Score Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Award size={24} style={{ color: 'var(--secondary)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Multimodal Communication Score
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Fused from speech rhythm, vocal clarity, eye gaze engagement, and physical posture.
            </p>
          </div>

          <div className="vid-score-hero">
            <div className="vid-score-badge-circle">
              <span className="vid-score-num">{scores.overall_10.toFixed(1)}</span>
              <span className="vid-score-denom">/ 10</span>
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {scores.overall_10 >= 8.0 ? 'Exceptional Composure' : scores.overall_10 >= 6.0 ? 'Solid Conversational Delivery' : 'Needs Practice & Pacing'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Duration: {Math.round(durationSec)}s • Internal Score: {scores.overall_100.toFixed(1)}/100
              </p>
            </div>
          </div>

          {scores.unavailable && scores.unavailable.length > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
              * Adjusted weights: [{scores.unavailable.join(', ')}] unavailable during this clip.
            </p>
          )}
        </div>

        {/* Right: Radar Chart Visualization */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Multimodal Competency Radar
          </h4>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.15)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Radar name="Score" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: 4 Sub-Score Metric Cards */}
      <div className="vid-subscores-grid">
        <div className="vid-subscore-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} style={{ color: 'var(--primary)' }} />
            <span className="vid-subscore-label">Fluency (F)</span>
          </div>
          <span className="vid-subscore-val">{scores.F !== null ? `${scores.F.toFixed(1)}%` : 'N/A'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rate, fillers & pauses</span>
        </div>

        <div className="vid-subscore-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} style={{ color: 'var(--accent)' }} />
            <span className="vid-subscore-label">Speech Clarity (P)</span>
          </div>
          <span className="vid-subscore-val">{scores.P !== null ? `${scores.P.toFixed(1)}%` : 'N/A'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Whisper acoustic confidence</span>
        </div>

        <div className="vid-subscore-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={14} style={{ color: 'var(--secondary)' }} />
            <span className="vid-subscore-label">Non-Verbal (N)</span>
          </div>
          <span className="vid-subscore-val">{scores.N !== null ? `${scores.N.toFixed(1)}%` : 'N/A'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gaze & head stability</span>
        </div>

        <div className="vid-subscore-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Smile size={14} style={{ color: 'var(--success)' }} />
            <span className="vid-subscore-label">Emotion (E)</span>
          </div>
          <span className="vid-subscore-val">{scores.E !== null ? `${scores.E.toFixed(1)}%` : 'N/A'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Facial composure proxy</span>
        </div>
      </div>
    </div>
  );
};
