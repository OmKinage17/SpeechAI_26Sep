import React, { useEffect, useRef } from 'react';
import { Camera, Mic, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useFaceTracking } from '../hooks/useFaceTracking';

interface SetupCheckProps {
  stream: MediaStream | null;
  micLevel: number;
  error: string | null;
  onProceed: () => void;
  onStartCamera: () => void;
}

export const SetupCheck: React.FC<SetupCheckProps> = ({
  stream,
  micLevel,
  error,
  onProceed,
  onStartCamera
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Use the new face tracking hook
  const { faceBox, isModelLoading } = useFaceTracking(videoRef, stream, true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const hasStream = stream !== null && stream.active;

  return (
    <div className="vid-setup-grid">
      {/* Left: Camera Preview Box */}
      <div className="vid-camera-box">
        {hasStream ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="vid-camera-video" />
            
            {/* Dynamic Tracking Box */}
            {faceBox && !isModelLoading && (
              <div 
                className="vid-face-guide-overlay"
                style={{
                  left: `${faceBox.x}%`,
                  top: `${faceBox.y}%`,
                  width: `${faceBox.width}%`,
                  height: `${faceBox.height}%`
                }}
              >
                <span className="vid-face-guide-text">Face Detected</span>
              </div>
            )}
            
            {/* Loading Indicator */}
            {isModelLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(10, 14, 26, 0.75)',
                padding: '16px 24px',
                borderRadius: 'var(--radius-md)',
                color: 'white'
              }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Loading AI Face Tracker...</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <Camera size={48} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Camera & Microphone Setup
            </p>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>
              We need temporary access to your camera and mic to evaluate speech pacing, eye contact, and head composure.
            </p>
            <button className="vid-btn-primary" onClick={onStartCamera}>
              <Camera size={16} /> Enable Camera & Microphone
            </button>
          </div>
        )}
      </div>

      {/* Right: Status & Checklist Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Equipment & Framing Checklist
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Camera status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasStream ? (
                <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              )}
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Video Feed</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {hasStream 
                    ? (faceBox ? 'Camera active. Face successfully tracked.' : 'Camera active. Detecting face...') 
                    : 'Camera waiting for permission.'}
                </p>
              </div>
            </div>

            {/* Mic status & live volume bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {micLevel > 5 ? (
                <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
              ) : (
                <Mic size={20} style={{ color: hasStream ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Microphone Input</p>
                <div className="vid-meter-container">
                  <div className="vid-meter-bar-bg">
                    <div className="vid-meter-bar-fill" style={{ width: `${micLevel}%` }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {micLevel > 5 ? 'Vocal signal detected' : 'Speak to test audio level'}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: '13px', background: 'var(--error-light)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        <button
          className="vid-btn-primary"
          onClick={onProceed}
          style={{ marginTop: '24px' }}
        >
          <span>Continue to Recording</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
