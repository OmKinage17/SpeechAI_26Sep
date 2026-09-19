import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseMediaRecorderOptions {
  maxDurationSec?: number;
  onAutoStop?: (blob: Blob) => void;
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const { maxDurationSec = 120, onAutoStop } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize camera and microphone stream
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);

      // Setup audio level meter
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(mediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const level = Math.min(100, Math.round((avg / 128) * 100));
            setMicLevel(level);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          }
        };
        checkVolume();
      } catch (e) {
        console.warn('AudioContext volume meter could not start:', e);
      }

      return mediaStream;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access camera and microphone.';
      setError(msg);
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setMicLevel(0);
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [stopCamera, recordedUrl]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream) {
      setError('No active media stream to record.');
      return;
    }

    // Determine supported mimeType
    const candidateTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4'
    ];
    let selectedMime = '';
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMime = type;
        break;
      }
    }

    try {
      chunksRef.current = [];
      const recorder = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: selectedMime || 'video/webm' });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setRecordedUrl(url);
        setIsRecording(false);
        if (onAutoStop) {
          onAutoStop(finalBlob);
        }
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start elapsed timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          if (next >= maxDurationSec) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start MediaRecorder.';
      setError(msg);
    }
  }, [stream, maxDurationSec, onAutoStop]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const retake = useCallback(async () => {
    if (recordedUrl) {
      try {
        URL.revokeObjectURL(recordedUrl);
      } catch {}
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];

    // Verify stream is active; if stopped or ended, restart camera
    const isStreamActive = streamRef.current && streamRef.current.active && streamRef.current.getVideoTracks().some(t => t.readyState === 'live');
    if (!isStreamActive) {
      await startCamera();
    }
  }, [recordedUrl, startCamera]);

  return {
    stream,
    isRecording,
    isPaused,
    recordedBlob,
    recordedUrl,
    recordingTime,
    micLevel,
    error,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    retake
  };
}
