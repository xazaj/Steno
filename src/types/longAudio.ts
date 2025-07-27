// 长音频处理相关类型定义

export interface AudioSegment {
  id: string;
  start_time: number;
  end_time: number;
  duration: number;
  sample_start: number;
  sample_end: number;
  status: SegmentStatus;
  text?: string;
  confidence?: number;
  processing_time?: number;
  error?: string;
}

export type SegmentStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface LongAudioTask {
  id: string;
  record_id: string;
  file_path: string;
  total_duration: number;
  total_segments: number;
  completed_segments: number;
  failed_segments: number;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  segments: AudioSegment[];
  final_text?: string;
  processing_stats: ProcessingStats;
}

export type TaskStatus = 'Preparing' | 'Processing' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled';

export interface ProcessingStats {
  average_processing_speed: number;
  estimated_remaining_time?: number;
  active_workers: number;
  memory_usage_mb: number;
  accuracy_estimate?: number;
}

export interface ProcessingConfig {
  language: string;
  model_mode: string;
  audio_enhancement: boolean;
  segment_overlap: number;
  max_segment_length: number;
  min_segment_length: number;
}

// 事件类型
export interface LongAudioPreprocessingEvent {
  task_id: string;
  stage: 'loading' | 'segmenting';
  message: string;
}

export interface LongAudioTaskCreatedEvent {
  task_id: string;
  total_segments: number;
  total_duration: number;
  message: string;
}

export interface LongAudioSegmentCompletedEvent {
  task_id: string;
  completed_segments: number;
  total_segments: number;
  progress: number;
  segment_id: string;
  segment_text: string;
  processing_stats: ProcessingStats;
}

export interface LongAudioSegmentFailedEvent {
  task_id: string;
  segment_id: string;
  error: string;
}

export interface LongAudioTaskCompletedEvent {
  task_id: string;
  final_text: string;
  message: string;
}