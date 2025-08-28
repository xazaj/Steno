import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface RealtimeConfig {
  language: 'zh' | 'en' | 'auto' | 'id';
  mode: 'streaming' | 'buffered' | 'hybrid';
  speakerDiarization: boolean;
  noiseReduction: boolean;
  autoSave: boolean;
  saveInterval: number; // minutes
}

export interface RecognitionResult {
  text: string;
  confidence: number;
  isTemporary: boolean;
  speaker?: string;
  timestamp: number;
}

export interface AudioLevelUpdate {
  level: number;
  timestamp: number;
}

export interface RecordingStats {
  duration: number; // seconds
  segmentsCount: number;
  speakerCount: number;
  averageConfidence: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  confidence: number;
  isTemporary: boolean;
}

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing';

export interface RecordingState {
  status: RecordingStatus;
  duration: number;
  segments: TranscriptSegment[];
  currentText: string;
  confidence: number;
  speakerCount: number;
  audioFilePath?: string;
}

export interface UseRealtimeRecordingReturn {
  // 状态
  recordingState: RecordingState;
  audioLevel: number;
  isSupported: boolean;
  error: string | null;
  
  // 操作
  startRecording: (config: RealtimeConfig) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearTranscript: () => void;
  
  // 配置
  updateConfig: (config: Partial<RealtimeConfig>) => void;
  config: RealtimeConfig;
}

const DEFAULT_CONFIG: RealtimeConfig = {
  language: 'zh',
  mode: 'hybrid',
  speakerDiarization: true,
  noiseReduction: true,
  autoSave: true,
  saveInterval: 5,
};

export const useRealtimeRecording = (): UseRealtimeRecordingReturn => {
  const [config, setConfig] = useState<RealtimeConfig>(DEFAULT_CONFIG);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    status: 'idle',
    duration: 0,
    segments: [],
    currentText: '',
    confidence: 0.95,
    speakerCount: 1,
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用于管理事件监听器的引用
  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const durationTimerRef = useRef<number>();
  const segmentIdCounterRef = useRef(0);

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
      const audioLevelUnlisten = await listen<AudioLevelUpdate>('audio_level_update', (event) => {
        setAudioLevel(event.payload.level);
      });
      unlistenersRef.current.push(audioLevelUnlisten);

      // 识别结果监听器
      const recognitionUnlisten = await listen<RecognitionResult>('recognition_result', (event) => {
        const result = event.payload;
        const segmentId = `segment_${segmentIdCounterRef.current++}`;
        
        const newSegment: TranscriptSegment = {
          id: segmentId,
          text: result.text,
          speaker: result.speaker,
          timestamp: result.timestamp,
          confidence: result.confidence,
          isTemporary: result.isTemporary,
        };

        setRecordingState(prev => {
          if (result.isTemporary) {
            // 临时结果 - 更新当前文本
            return {
              ...prev,
              currentText: result.text,
              confidence: result.confidence,
            };
          } else {
            // 最终结果 - 添加到段落列表
            const updatedSegments = [...prev.segments, newSegment];
            const avgConfidence = updatedSegments.reduce((sum, seg) => sum + seg.confidence, 0) / updatedSegments.length;
            
            // 清除当前临时文本
            return {
              ...prev,
              segments: updatedSegments,
              currentText: '',
              confidence: avgConfidence,
            };
          }
        });
      });
      unlistenersRef.current.push(recognitionUnlisten);

      // 录音统计监听器
      const statsUnlisten = await listen<RecordingStats>('recording_stats', (event) => {
        const stats = event.payload;
        setRecordingState(prev => ({
          ...prev,
          speakerCount: stats.speakerCount,
          confidence: stats.averageConfidence,
        }));
      });
      unlistenersRef.current.push(statsUnlisten);

      // 录音完成监听器
      const completedUnlisten = await listen('recording_completed', () => {
        console.log('📝 录音完成事件接收到');
        setRecordingState(prev => ({
          ...prev,
          status: 'idle',
        }));
        setAudioLevel(0);
        cleanup();
      });
      unlistenersRef.current.push(completedUnlisten);

      // 录音停止监听器
      const stoppedUnlisten = await listen('recording_stopped', () => {
        console.log('🛑 录音停止事件接收到');
        setRecordingState(prev => ({
          ...prev,
          status: 'idle',
        }));
        setAudioLevel(0);
      });
      unlistenersRef.current.push(stoppedUnlisten);

      // 录音文件保存监听器
      const fileSavedUnlisten = await listen<string>('recording_file_saved', (event) => {
        console.log('💾 录音文件已保存:', event.payload);
        // 将文件路径存储到状态中，供外部组件使用
        setRecordingState(prev => ({
          ...prev,
          audioFilePath: event.payload,
        }));
      });
      unlistenersRef.current.push(fileSavedUnlisten);

      // 录音错误监听器
      const errorUnlisten = await listen<string>('recording_error', (event) => {
        const errorMessage = event.payload;
        console.error('录音错误详情:', errorMessage);
        console.error('完整错误事件:', event);
        setError(`录音失败: ${errorMessage}`);
        setRecordingState(prev => ({
          ...prev,
          status: 'idle',
        }));
        cleanup();
      });
      unlistenersRef.current.push(errorUnlisten);

    } catch (error) {
      console.error('设置事件监听器失败:', error);
      setError('设置实时识别监听器失败');
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
  const startRecording = useCallback(async (newConfig: RealtimeConfig) => {
    try {
      setError(null);
      setConfig(newConfig);
      
      // 重置状态
      setRecordingState({
        status: 'recording',
        duration: 0,
        segments: [],
        currentText: '',
        confidence: 0.95,
        speakerCount: 1,
      });
      setAudioLevel(0);
      segmentIdCounterRef.current = 0;

      // 设置事件监听器
      await setupEventListeners();

      // 启动后端录音 - 转换配置格式以匹配后端期望
      const backendConfig = {
        language: newConfig.language,
        mode: newConfig.mode,
        speaker_diarization: newConfig.speakerDiarization,
        noise_reduction: newConfig.noiseReduction,
        auto_save: newConfig.autoSave,
        save_interval: newConfig.saveInterval,
      };
      
      console.log('发送给后端的配置:', backendConfig);
      await invoke('start_realtime_recording', { config: backendConfig });
      
      // 开始计时
      startDurationTimer();
      
    } catch (error) {
      console.error('开始录音失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`启动录音失败: ${errorMessage}`);
      setRecordingState(prev => ({ ...prev, status: 'idle' }));
      cleanup();
    }
  }, [setupEventListeners, startDurationTimer, cleanup]);

  // 暂停录音
  const pauseRecording = useCallback(async () => {
    try {
      await invoke('pause_realtime_recording');
      setRecordingState(prev => ({ ...prev, status: 'paused' }));
      stopDurationTimer();
    } catch (error) {
      console.error('暂停录音失败:', error);
      setError(`暂停录音失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [stopDurationTimer]);

  // 恢复录音
  const resumeRecording = useCallback(async () => {
    try {
      await invoke('resume_realtime_recording');
      setRecordingState(prev => ({ ...prev, status: 'recording' }));
      startDurationTimer();
    } catch (error) {
      console.error('恢复录音失败:', error);
      setError(`恢复录音失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [startDurationTimer]);

  // 停止录音
  const stopRecording = useCallback(async () => {
    try {
      setRecordingState(prev => ({ ...prev, status: 'processing' }));
      await invoke('stop_realtime_recording');
      stopDurationTimer();
      // 注意：状态会在 recording_completed 事件中更新为 idle
    } catch (error) {
      console.error('停止录音失败:', error);
      setError(`停止录音失败: ${error instanceof Error ? error.message : String(error)}`);
      setRecordingState(prev => ({ ...prev, status: 'idle' }));
      cleanup();
    }
  }, [stopDurationTimer, cleanup]);

  // 清除转录结果
  const clearTranscript = useCallback(() => {
    setRecordingState(prev => ({
      ...prev,
      segments: [],
      currentText: '',
    }));
    segmentIdCounterRef.current = 0;
  }, []);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<RealtimeConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // 检查是否支持实时录音
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // 这里可以添加检查麦克风权限等逻辑
        setIsSupported(true);
      } catch (error) {
        console.error('检查实时录音支持失败:', error);
        setIsSupported(false);
        setError('当前环境不支持实时录音功能');
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
    isSupported,
    error,
    
    // 操作
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearTranscript,
    
    // 配置
    updateConfig,
    config,
  };
};