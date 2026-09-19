import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { WindowTimelineItem } from '../types';
import { Clock, AlertCircle } from 'lucide-react';

interface FusionTimelineProps {
  timeline: WindowTimelineItem[];
}

export const FusionTimeline: React.FC<FusionTimelineProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  const chartData = timeline.map(w => ({
    time: `${w.t_start}s-${w.t_end}s`,
    wpm: w.wpm,
    gaze: Math.round(w.camera_facing * 100),
    fillers: w.filler_count,
    flags: w.flags
  }));

  const allFlags = timeline.flatMap(w => w.flags.map(f => ({ time: `${w.t_start}s`, text: f })));

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            5-Second Multimodal Fusion Timeline
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} /> WPM (Pace)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} /> Gaze % (Camera-Facing)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Fillers
          </span>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Synchronized time-alignment connecting vocal rate changes with visual gaze engagement.
      </p>

      <div style={{ width: '100%', height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar yAxisId="right" dataKey="fillers" fill="#f59e0b" fillOpacity={0.6} barSize={12} radius={[4, 4, 0, 0]} name="Filler Words" />
            <Line yAxisId="left" type="monotone" dataKey="wpm" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} name="Speed (WPM)" />
            <Line yAxisId="right" type="monotone" dataKey="gaze" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} name="Eye Contact %" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Flagged Moments List */}
      {allFlags.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allFlags.map((flag, i) => (
            <div key={i} className="vid-flag-pill">
              <AlertCircle size={12} />
              <span>[{flag.time}] {flag.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
