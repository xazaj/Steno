import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// 新的优化配置接口
export interface OptimalRealtimeConfig {
  language: 'zh' | 'en' | 'auto';
  enableSpeakerDiarization: boolean;
  enableContextAwareness: boolean;
  qualityThreshold: number;
  maxSegmentDuration: number; // milliseconds
  bufferDuration: number; // milliseconds
  initialPrompt?: string; // 添加提示词支持
}

// 转录结果事件
export interface TranscriptionResultEvent {
  segmentId: string;
  text: string;
  confidence: number;
  isTemporary: boolean;
  speaker?: string;
  timestamp: number;
  processingTimeMs: number;
}

// 音频级别事件
export interface AudioLevelEvent {
  level: number;
  speechProbability: number;
  timestamp: number;
}

// 处理统计事件
export interface ProcessingStatsEvent {
  segmentsProcessed: number;
  avgProcessingTime: number;
  qualityReport: QualityReport;
  speakerCount: number;
  bufferUsage: number;
}

export interface QualityReport {
  totalSegments: number;
  highQualitySegments: number;
  lowQualitySegments: number;
  correctedSegments: number;
  averageConfidence: number;
  qualityPercentage: number;
  totalConfidence: number;
}

// 管理的转录段
export interface ManagedTranscriptSegment {
  id: string;
  text: string;
  confidence: number;
  speaker?: string;
  timestamp: number;
  startTime: number;
  endTime: number;
  isFinal: boolean;
  source: 'FastProcessing' | 'AccurateProcessing' | 'Merged' | 'UserCorrected';
  corrections: TextCorrection[];
}

export interface TextCorrection {
  original: string;
  corrected: string;
  reason: 'DeduplicationMerge' | 'ContextualCorrection' | 'GrammarFix' | 'SpeakerConsistency' | 'UserEdit';
  confidence: number;
}

// 实时转录事件
export interface RealtimeTranscriptionEvent {
  eventType: string;
  data: any;
  timestamp: number;
}

export type OptimalRecordingStatus = 'idle' | 'recording' | 'paused' | 'processing';

export interface OptimalRecordingState {
  status: OptimalRecordingStatus;
  duration: number;
  segments: ManagedTranscriptSegment[];
  temporaryText: string;
  confidence: number;
  speakerCount: number;
  qualityReport?: QualityReport;
  speechProbability: number;
}

export interface UseOptimalRealtimeRecordingReturn {
  // 状态
  recordingState: OptimalRecordingState;
  audioLevel: number;
  processingStats?: ProcessingStatsEvent;
  isSupported: boolean;
  error: string | null;
  
  // 操作
  startRecording: (config: OptimalRealtimeConfig) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  updateSegment: (segmentId: string, newText: string) => Promise<boolean>;
  clearTranscript: () => void;
  
  // 配置
  updateConfig: (config: Partial<OptimalRealtimeConfig>) => void;
  config: OptimalRealtimeConfig;
}

const DEFAULT_OPTIMAL_CONFIG: OptimalRealtimeConfig = {
  language: 'zh',
  enableSpeakerDiarization: true,
  enableContextAwareness: true,
  qualityThreshold: 0.7,
  maxSegmentDuration: 10000, // 10秒
  bufferDuration: 300000, // 5分钟
  initialPrompt: undefined, // 默认不使用提示词
};

export const useOptimalRealtimeRecording = (): UseOptimalRealtimeRecordingReturn => {
  const [config, setConfig] = useState<OptimalRealtimeConfig>(DEFAULT_OPTIMAL_CONFIG);
  const [recordingState, setRecordingState] = useState<OptimalRecordingState>({
    status: 'idle',
    duration: 0,
    segments: [],
    temporaryText: '',
    confidence: 0.95,
    speakerCount: 1,
    speechProbability: 0.0,
  });
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [processingStats, setProcessingStats] = useState<ProcessingStatsEvent>();
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用于管理事件监听器的引用
  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const durationTimerRef = useRef<number>();

  // 清理函数
  const cleanup = useCallback(() => {
    // 清理事件监听器
    unlistenersRef.current.forEach(unlisten => unlisten());
    unlistenersRef.current = [];
    
    // 清理计时器
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = undefined;
    }
  }, []);

  // 设置事件监听器
  const setupEventListeners = useCallback(async () => {
    try {
      // 音频级别更新监听器
      const audioLevelUnlisten = await listen<AudioLevelEvent>('audio_level_update', (event) => {
        const { level, speechProbability } = event.payload;
        setAudioLevel(level);
        setRecordingState(prev => ({
          ...prev,
          speechProbability,
        }));
      });
      unlistenersRef.current.push(audioLevelUnlisten);

      // 转录结果监听器
      const transcriptionUnlisten = await listen<TranscriptionResultEvent>('transcription_result', (event) => {
        const result = event.payload;
        
        if (result.isTemporary) {
          // 临时结果 - 更新临时文本
          setRecordingState(prev => ({
            ...prev,
            temporaryText: result.text,
            confidence: result.confidence,
          }));
        } else {
          // 最终结果 - 清空临时文本，等待段落更新事件
          setRecordingState(prev => ({
            ...prev,
            temporaryText: '',
          }));
        }
      });
      unlistenersRef.current.push(transcriptionUnlisten);

      // 段落更新监听器
      const segmentUnlisten = await listen<{segment_id: string}>('segment_updated', async (_event) => {
        try {
          // 获取最新的段落列表
          const segments = await invoke<ManagedTranscriptSegment[]>('get_optimal_segments');
          
          setRecordingState(prev => {
            // 计算平均置信度
            const avgConfidence = segments.length > 0 
              ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
              : prev.confidence;
            
            // 统计说话人数量
            const speakers = new Set(segments.map(seg => seg.speaker).filter(Boolean));
            
            return {
              ...prev,
              segments,
              confidence: avgConfidence,
              speakerCount: speakers.size || 1,
            };
          });
        } catch (error) {
          console.error('获取段落列表失败:', error);
        }
      });
      unlistenersRef.current.push(segmentUnlisten);

      // 处理统计监听器
      const statsUnlisten = await listen<ProcessingStatsEvent>('processing_stats', (event) => {
        const stats = event.payload;
        setProcessingStats(stats);
        setRecordingState(prev => ({
          ...prev,
          qualityReport: stats.qualityReport,
          speakerCount: stats.speakerCount,
        }));
      });
      unlistenersRef.current.push(statsUnlisten);

      // 实时转录事件监听器
      const realtimeEventUnlisten = await listen<RealtimeTranscriptionEvent>('realtime_transcription_event', (event) => {
        const { eventType, data } = event.payload;
        
        switch (eventType) {
          case 'recording_paused':
            setRecordingState(prev => ({ ...prev, status: 'paused' }));
            break;
          case 'recording_resumed':
            setRecordingState(prev => ({ ...prev, status: 'recording' }));
            break;
          case 'recording_completed':
            setRecordingState(prev => ({ ...prev, status: 'idle' }));
            setAudioLevel(0);
            cleanup();
            break;
          case 'final_quality_report':
            setRecordingState(prev => ({ ...prev, qualityReport: data }));
            break;
          default:
            console.log('未处理的实时事件:', eventType, data);
        }
      });
      unlistenersRef.current.push(realtimeEventUnlisten);

      // 错误监听器
      const errorUnlisten = await listen<string>('recording_error', (event) => {
        const errorMessage = event.payload;
        console.error('录音错误:', errorMessage);
        setError(`录音失败: ${errorMessage}`);
        setRecordingState(prev => ({ ...prev, status: 'idle' }));
        cleanup();
      });
      unlistenersRef.current.push(errorUnlisten);

    } catch (error) {
      console.error('设置事件监听器失败:', error);
      setError('设置优化实时识别监听器失败');
    }
  }, [cleanup]);

  // 开始录音时长计时器
  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    
    const startTime = Date.now();
    durationTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingState(prev => ({
        ...prev,
        duration: elapsed,
      }));
    }, 1000);
  }, []);

  // 停止计时器
  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = undefined;
    }
  }, []);

  // 开始录音
  const startRecording = useCallback(async (newConfig: OptimalRealtimeConfig) => {
    try {
      setError(null);
      setConfig(newConfig);
      
      // 重置状态
      setRecordingState({
        status: 'recording',
        duration: 0,
        segments: [],
        temporaryText: '',
        confidence: 0.95,
        speakerCount: 1,
        speechProbability: 0.0,
      });
      setAudioLevel(0);
      setProcessingStats(undefined);

      // 设置事件监听器
      await setupEventListeners();

      // 启动后端录音 - 使用新的优化API
      const backendConfig = {
        language: newConfig.language,
        enable_speaker_diarization: newConfig.enableSpeakerDiarization,
        enable_context_awareness: newConfig.enableContextAwareness,
        quality_threshold: newConfig.qualityThreshold,
        max_segment_duration: newConfig.maxSegmentDuration,
        buffer_duration: newConfig.bufferDuration,
        initial_prompt: newConfig.initialPrompt,
      };
      
      console.log('启动优化实时录音，配置:', backendConfig);
      await invoke('start_optimal_realtime_recording', { config: backendConfig });
      
      // 开始计时
      startDurationTimer();
      
    } catch (error) {
      console.error('开始优化录音失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`启动优化录音失败: ${errorMessage}`);
      setRecordingState(prev => ({ ...prev, status: 'idle' }));
      cleanup();
    }
  }, [setupEventListeners, startDurationTimer, cleanup]);

  // 暂停录音
  const pauseRecording = useCallback(async () => {
    try {
      await invoke('pause_optimal_realtime_recording');
      // 状态会在事件中更新
      stopDurationTimer();
    } catch (error) {
      console.error('暂停优化录音失败:', error);
      setError(`暂停录音失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [stopDurationTimer]);

  // 恢复录音
  const resumeRecording = useCallback(async () => {
    try {
      await invoke('resume_optimal_realtime_recording');
      // 状态会在事件中更新
      startDurationTimer();
    } catch (error) {
      console.error('恢复优化录音失败:', error);
      setError(`恢复录音失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [startDurationTimer]);

  // 停止录音
  const stopRecording = useCallback(async () => {
    try {
      setRecordingState(prev => ({ ...prev, status: 'processing' }));
      await invoke('stop_optimal_realtime_recording');
      stopDurationTimer();
      // 状态会在事件中更新为 idle
    } catch (error) {
      console.error('停止优化录音失败:', error);
      setError(`停止录音失败: ${error instanceof Error ? error.message : String(error)}`);
      setRecordingState(prev => ({ ...prev, status: 'idle' }));
      cleanup();
    }
  }, [stopDurationTimer, cleanup]);

  // 更新段落文本
  const updateSegment = useCallback(async (segmentId: string, newText: string): Promise<boolean> => {
    try {
      const success = await invoke<boolean>('update_optimal_segment', {
        segmentId,
        newText,
      });
      
      if (success) {
        // 更新本地状态
        setRecordingState(prev => ({
          ...prev,
          segments: prev.segments.map(segment =>
            segment.id === segmentId
              ? { ...segment, text: newText, source: 'UserCorrected' as const }
              : segment
          ),
        }));
      }
      
      return success;
    } catch (error) {
      console.error('更新段落失败:', error);
      setError(`更新段落失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, []);

  // 清除转录结果
  const clearTranscript = useCallback(() => {
    setRecordingState(prev => ({
      ...prev,
      segments: [],
      temporaryText: '',
    }));
  }, []);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<OptimalRealtimeConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // 检查是否支持优化实时录音
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // 这里可以添加检查麦克风权限等逻辑
        setIsSupported(true);
      } catch (error) {
        console.error('检查优化实时录音支持失败:', error);
        setIsSupported(false);
        setError('当前环境不支持优化实时录音功能');
      }
    };

    checkSupport();
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 当状态变为非录音状态时停止音频级别更新
  useEffect(() => {
    if (recordingState.status !== 'recording') {
      const timer = setTimeout(() => {
        setAudioLevel(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [recordingState.status]);

  return {
    // 状态
    recordingState,
    audioLevel,
    processingStats,
    isSupported,
    error,
    
    // 操作
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateSegment,
    clearTranscript,
    
    // 配置
    updateConfig,
    config,
  };
};