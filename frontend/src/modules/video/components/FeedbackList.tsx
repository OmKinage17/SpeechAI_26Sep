import React from 'react';
import type { FeedbackItem } from '../types';
import { Lightbulb, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface FeedbackListProps {
  feedback: FeedbackItem[];
  qualityWarnings: string[];
}

export const FeedbackList: React.FC<FeedbackListProps> = ({ feedback, qualityWarnings }) => {
  const safeFeedback = (feedback || []).map(f => {
    if (typeof f === 'string') {
      return { category: 'speech', severity: 'tip', message: f };
    }
    return {
      category: f?.category || 'speech',
      severity: f?.severity || 'tip',
      message: f?.message || JSON.stringify(f)
    };
  });

  const speechItems = safeFeedback.filter(f => f.category === 'speech');
  const nonVerbalItems = safeFeedback.filter(f => f.category === 'non_verbal');
  const otherItems = safeFeedback.filter(f => f.category !== 'speech' && f.category !== 'non_verbal');

  const renderIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />;
      default:
        return <Lightbulb size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Speech Feedback Card */}
      {speechItems.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Speech & Vocal Dynamics</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {speechItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                {renderIcon(item.severity)}
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-Verbal Feedback Card */}
      {nonVerbalItems.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Non-Verbal & Postural Composure</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {nonVerbalItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                {renderIcon(item.severity)}
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Diagnostic Items */}
      {otherItems.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>General Diagnostic Feedback</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {otherItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                {renderIcon(item.severity)}
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Warnings */}
      {qualityWarnings && qualityWarnings.length > 0 && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--warning)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={16} /> Environmental & Camera Warnings
          </h4>
          {qualityWarnings.map((warn, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '24px' }}>
              • {warn}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
