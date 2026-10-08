import React, { useMemo } from 'react';
import { Volume2 } from 'lucide-react';

interface PronunciationHighlightProps {
  targetText: string;
  spokenText: string;
}

export const PronunciationHighlight: React.FC<PronunciationHighlightProps> = ({ targetText, spokenText }) => {
  const mismatchedIndices = useMemo(() => {
    if (!targetText || !spokenText) return new Set<number>();
    
    const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetWords = targetText.trim().split(/\s+/).filter(Boolean);
    const spokenWords = spokenText.trim().split(/\s+/).filter(Boolean);
    
    const cleanT = targetWords.map(cleanWord);
    const cleanS = spokenWords.map(cleanWord);
    
    const n = cleanT.length;
    const m = cleanS.length;
    
    // DP matrix for Sequence Alignment (LCS with word similarity scoring)
    const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
    
    const getSimilarity = (w1: string, w2: string) => {
      if (w1 === w2) return 1.0;
      if (!w1 || !w2) return 0.0;
      if (w1.length >= 3 && w2.length >= 3) {
        if (w1.startsWith(w2) || w2.startsWith(w1)) return 0.85;
        if (w1.includes(w2) || w2.includes(w1)) return 0.75;
      }
      return 0.0;
    };
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const t = cleanT[i - 1];
        const s = cleanS[j - 1];
        if (t === s) {
          dp[i][j] = dp[i - 1][j - 1] + 1.0;
        } else {
          const sim = getSimilarity(t, s);
          if (sim >= 0.8) {
            dp[i][j] = dp[i - 1][j - 1] + sim;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }
    }
    
    // Backtracking to find accurately matched target indices
    const matchedTargetIndices = new Set<number>();
    let i = n, j = m;
    while (i > 0 && j > 0) {
      const t = cleanT[i - 1];
      const s = cleanS[j - 1];
      if (t === s) {
        matchedTargetIndices.add(i - 1);
        i--;
        j--;
      } else {
        const sim = getSimilarity(t, s);
        if (sim >= 0.8 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + sim)) < 1e-4) {
          // Morphological variant or close mispronunciation, consumed but not an exact match
          i--;
          j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
          i--;
        } else {
          j--;
        }
      }
    }
    
    const mismatched = new Set<number>();
    for (let k = 0; k < targetWords.length; k++) {
      if (!matchedTargetIndices.has(k)) {
        mismatched.add(k);
      }
    }
    return mismatched;
  }, [targetText, spokenText]);

  const speakWord = (word: string) => {
    if (!word || typeof window === 'undefined') return;
    const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    if (!clean) return;

    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 0.9;
        const voices = window.speechSynthesis.getVoices() || [];
        const preferred = voices.find((v: any) => /Microsoft|Zira|Aria|Davis|Guy|Hazel|Eva|Gwyneth/i.test(v.name));
        if (preferred) utter.voice = preferred;
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  };

  if (!targetText) return null;

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        Pronunciation Analysis
      </h3>
      <div className="practice-sentence-box" style={{ fontSize: '18px', lineHeight: '1.8', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {targetText.split(/\s+/).map((word, index) => {
            const isMismatched = mismatchedIndices.has(index);
            const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
            return (
              <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {isMismatched && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(cleanWord);
                    }}
                    title={`Listen to correct pronunciation of "${cleanWord}"`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 6px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid var(--primary)',
                      borderRadius: '4px',
                      color: 'var(--primary)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      verticalAlign: 'middle',
                    }}
                  >
                    <Volume2 size={11} />
                    <span>Listen</span>
                  </button>
                )}
                <span 
                  className={`practice-word ${isMismatched ? 'incorrect' : 'correct'}`}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: isMismatched ? '#ef4444' : '#22c55e',
                    backgroundColor: isMismatched ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.08)',
                    fontWeight: 600,
                    borderBottom: isMismatched ? '2px solid #ef4444' : '2px solid transparent'
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>Green: Correct Pronunciation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>Red: Wrong Pronunciation / Missed</span>
        </div>
      </div>

      {mismatchedIndices.size > 0 && (
        <div style={{ marginTop: '8px', padding: '14px', backgroundColor: 'rgba(239, 68, 68, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎧 Listen to Correct Pronunciation for Flagged Words:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Array.from(mismatchedIndices).map((idx) => {
              const fullWord = targetText.split(/\s+/)[idx] || '';
              const cleanWord = fullWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => speakWord(cleanWord)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid var(--primary)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title={`Listen to correct pronunciation of "${cleanWord}"`}
                >
                  <Volume2 size={13} style={{ color: 'var(--primary)' }} />
                  <span>Listen to "{cleanWord}"</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
