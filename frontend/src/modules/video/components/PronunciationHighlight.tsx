import React, { useMemo } from 'react';

interface PronunciationHighlightProps {
  targetText: string;
  spokenText: string;
}

export const PronunciationHighlight: React.FC<PronunciationHighlightProps> = ({ targetText, spokenText }) => {
  const mismatchedIndices = useMemo(() => {
    if (!targetText || !spokenText) return new Set<number>();
    
    const targetWords = targetText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/);
    const spokenWords = spokenText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/);
    
    const mismatched = new Set<number>();
    let spokenIdx = 0;
    
    for (let i = 0; i < targetWords.length; i++) {
      let found = false;
      for (let j = 0; j < 5 && (spokenIdx + j) < spokenWords.length; j++) {
        // loose matching (e.g., handles minor plural/tense differences sometimes)
        if (targetWords[i] === spokenWords[spokenIdx + j] || targetWords[i].includes(spokenWords[spokenIdx + j])) {
          found = true;
          spokenIdx = spokenIdx + j + 1;
          break;
        }
      }
      if (!found) {
        mismatched.add(i);
      }
    }
    return mismatched;
  }, [targetText, spokenText]);

  if (!targetText) return null;

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        Pronunciation Analysis
      </h3>
      <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.6', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {targetText.split(/\s+/).map((word, index) => {
            const isMismatched = mismatchedIndices.has(index);
            return (
              <span 
                key={index} 
                className={`practice-word ${isMismatched ? 'incorrect' : 'correct'}`}
                style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: isMismatched ? '#ef4444' : '#22c55e',
                    backgroundColor: isMismatched ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    fontWeight: isMismatched ? 'bold' : 'normal'
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
          <span>Correctly Pronounced</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
          <span>Mispronounced / Missed</span>
        </div>
      </div>
    </div>
  );
};
