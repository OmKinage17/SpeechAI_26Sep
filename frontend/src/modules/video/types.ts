export interface SpeechFeatures {
  transcript: string;
  word_count: number;
  wpm: number;
  filler_count: number;
  filler_types: string[];
  repetition_count: number;
  long_pauses: number;
  pause_ratio: number;
  clarity_raw: number;
  pause_events?: Array<{ start: number; end: number; duration: number }>;
  filler_details?: Array<{ word: string; start: number; end: number; duration: number }>;
  stammer_details?: Array<{ text: string; type: string; start: number; end: number; duration: number }>;
}

export interface VisualFeatures {
  face_presence_ratio: number;
  camera_facing_ratio: number;
  head_motion: number;
  posture_ok_ratio: number | null;
  dominant_emotion: string;
  emotion_distribution: Record<string, number>;
  brightness_mean: number;
}

export interface WindowTimelineItem {
  t_start: number;
  t_end: number;
  wpm: number;
  filler_count: number;
  pause_ratio: number;
  camera_facing: number;
  head_motion: number;
  dominant_emotion: string;
  flags: string[];
}

export interface ScoresBreakdown {
  F: number | null; // Fluency (0-100)
  P: number | null; // Speech clarity (0-100)
  N: number | null; // Non-verbal (0-100)
  E: number | null; // Emotion (0-100)
  G: number | null; // Grammar (optional)
  V: number | null; // Vocabulary (optional)
  overall_100: number; // 0-100 scale
  overall_10: number;  // 0-10 scale
  weights_used: Record<string, number>;
  unavailable: string[];
}

export interface FeedbackItem {
  category: 'speech' | 'non_verbal' | 'recording_quality' | string;
  severity: 'success' | 'tip' | 'warning' | string;
  message: string;
}

export interface VideoSessionDetail {
  id: string;
  user_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  stage: string;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
  task_type: string;
  prompt_text?: string | null;
  duration_sec: number;
  speech?: SpeechFeatures;
  visual?: VisualFeatures;
  timeline: WindowTimelineItem[];
  scores?: ScoresBreakdown;
  feedback: FeedbackItem[];
  quality_warnings: string[];
  timings?: Record<string, number>;
  rtf?: number;
}

export interface VideoJobResponse {
  job_id: string;
  status: string;
  stage: string;
  error?: string | null;
  created_at: string;
}
