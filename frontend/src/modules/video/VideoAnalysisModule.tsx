import React, { useState, useEffect } from 'react';
import './video.css';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import { SetupCheck } from './components/SetupCheck';
import { RecorderPanel } from './components/RecorderPanel';
import { ProcessingView } from './components/ProcessingView';
import { ScoreOverview } from './components/ScoreOverview';
import { FusionTimeline } from './components/FusionTimeline';
import { EmotionBreakdown } from './components/EmotionBreakdown';
import { FeedbackList } from './components/FeedbackList';
import { VideoHistory } from './components/VideoHistory';
import { SpeechDetailedMetrics } from './components/SpeechDetailedMetrics';
import { submitVideoAnalysis, pollSessionStatus, fetchUserVideoReports, deleteVideoSession } from './videoApi';
import type { VideoSessionDetail } from './types';
import { Video, History, RotateCcw } from 'lucide-react';

interface VideoAnalysisModuleProps {
  currentUser: { id: string; name: string; email: string } | null;
}

type ModuleStep = 'setup' | 'record' | 'processing' | 'results';

export const VideoAnalysisModule: React.FC<VideoAnalysisModuleProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'practice' | 'history'>('practice');
  const [step, setStep] = useState<ModuleStep>('setup');
  const [currentJobStage, setCurrentJobStage] = useState<string>('uploading');
  const [currentSession, setCurrentSession] = useState<VideoSessionDetail | null>(null);
  const [historySessions, setHistorySessions] = useState<VideoSessionDetail[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    stream,
    isRecording,
    recordingTime,
    recordedBlob,
    recordedUrl,
    micLevel,
    error: mediaError,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    retake
  } = useMediaRecorder({
    maxDurationSec: 120
  });

  const userId = currentUser ? currentUser.id : 'user_anonymous';

  // Load history when tab is switched to history
  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchUserVideoReports(userId).then(setHistorySessions);
    }
  }, [activeSubTab, userId]);

  // Handle video submission
  const handleSubmitRecording = async (taskType: string, promptText: string) => {
    if (!recordedBlob) return;
    setStep('processing');
    setCurrentJobStage('uploading');
    setSubmitError(null);

    try {
      const jobRes = await submitVideoAnalysis(recordedBlob, taskType, promptText);
      const jobId = jobRes.job_id;

      // Poll until completed
      const pollInterval = window.setInterval(async () => {
        try {
          const detail = await pollSessionStatus(jobId);
          if (detail.stage) {
            setCurrentJobStage(detail.stage);
          }

          if (detail.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setCurrentSession(detail);
            setStep('results');
            stopCamera();
          } else if (detail.status === 'FAILED') {
            clearInterval(pollInterval);
            setSubmitError(detail.error || 'Video analysis failed on server.');
            setStep('record');
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 1500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setSubmitError(msg);
      setStep('record');
    }
  };

  const handleStartFresh = () => {
    retake();
    setCurrentSession(null);
    setStep('setup');
  };

  const handleDeleteHistorySession = async (jobId: string) => {
    const ok = await deleteVideoSession(jobId);
    if (ok) {
      setHistorySessions(prev => prev.filter(s => s.id !== jobId));
      if (currentSession && currentSession.id === jobId) {
        setCurrentSession(null);
      }
    }
  };

  return (
    <div className="vid-container">
      {/* Hero Intro Header Card */}
      <div className="vid-hero-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
              Module 3
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Multimodal AI Pipeline</span>
          </div>
          <h1 className="vid-hero-title">Video & Communication Analysis</h1>
          <p className="vid-hero-subtitle">
            Synchronized speech and body language diagnostic trainer. Evaluates vocal pace, gaze engagement, head stability, and postural composure.
          </p>
        </div>

        {/* Sub-Tabs: Practice / History */}
        <div className="vid-step-nav">
          <button
            className={`vid-step-btn ${activeSubTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('practice')}
          >
            <Video size={16} /> Practice Session
          </button>
          <button
            className={`vid-step-btn ${activeSubTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            <History size={16} /> Past Reports
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {activeSubTab === 'history' ? (
        <VideoHistory
          sessions={historySessions}
          onSelectSession={(s) => {
            setCurrentSession(s);
            setStep('results');
            setActiveSubTab('practice');
          }}
          onDeleteSession={handleDeleteHistorySession}
        />
      ) : (
        <>
          {submitError && (
            <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', padding: '12px 18px', borderRadius: 'var(--radius-md)', color: 'var(--error)', fontSize: '14px' }}>
              {submitError}
            </div>
          )}

          {step === 'setup' && (
            <SetupCheck
              stream={stream}
              micLevel={micLevel}
              error={mediaError}
              onStartCamera={startCamera}
              onProceed={() => {
                if (!stream) {
                  startCamera();
                }
                setStep('record');
              }}
            />
          )}

          {step === 'record' && (
            <RecorderPanel
              stream={stream}
              isRecording={isRecording}
              recordingTime={recordingTime}
              recordedUrl={recordedUrl}
              micLevel={micLevel}
              onStartRecord={startRecording}
              onStopRecord={stopRecording}
              onRetake={retake}
              onSubmit={handleSubmitRecording}
            />
          )}

          {step === 'processing' && (
            <ProcessingView stage={currentJobStage} />
          )}

          {step === 'results' && currentSession && currentSession.scores && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Session Analysis Report
                </h2>
                <button className="vid-btn-primary" onClick={handleStartFresh}>
                  <RotateCcw size={16} /> Record Another Session
                </button>
              </div>

              {/* 1. Score Overview & Radar */}
              <ScoreOverview
                scores={currentSession.scores}
                durationSec={currentSession.duration_sec}
              />

              {/* 1.5 Detailed Speech Analytics */}
              {currentSession.speech && (
                <SpeechDetailedMetrics
                  speech={currentSession.speech}
                  durationSec={currentSession.duration_sec}
                />
              )}


              {/* 2. 5-Second Window Fusion Timeline */}
              <FusionTimeline timeline={currentSession.timeline} />

              {/* 3. Emotion Breakdown & Feedback List */}
              <div className="vid-results-grid">
                <EmotionBreakdown
                  distribution={currentSession.visual?.emotion_distribution || {}}
                  dominantEmotion={currentSession.visual?.dominant_emotion || 'neutral'}
                />
                <FeedbackList
                  feedback={currentSession.feedback}
                  qualityWarnings={currentSession.quality_warnings}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
