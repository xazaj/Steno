import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';
import {
  LongAudioTask,
  // AudioSegment,
  LongAudioPreprocessingEvent,
  LongAudioTaskCreatedEvent,
  LongAudioSegmentCompletedEvent,
  LongAudioSegmentFailedEvent,
  LongAudioTaskCompletedEvent,
  ProcessingConfig
} from '../types/longAudio';
import { TranscriptionRecord } from '../types/transcription';

interface LongAudioProcessorProps {
  record: TranscriptionRecord;
  config: ProcessingConfig;
  onComplete: (result: { text: string; processingTime: number }) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

const LongAudioProcessor: React.FC<LongAudioProcessorProps> = ({
  record,
  config,
  onComplete,
  onProgress,
  onError
}) => {
  const [task, setTask] = useState<LongAudioTask | null>(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessingMessage, setPreprocessingMessage] = useState<string>('');
  const [streamingText] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const unlistenFunctions = useRef<UnlistenFn[]>([]);
  const taskStartTime = useRef<number>(0);

  // 初始化事件监听
  useEffect(() => {
    const setupEventListeners = async () => {
      try {
        const unlisteners = await Promise.all([
          listen<LongAudioPreprocessingEvent>('long_audio_preprocessing', handlePreprocessing),
          listen<LongAudioTaskCreatedEvent>('long_audio_task_created', handleTaskCreated),
          listen<LongAudioSegmentCompletedEvent>('long_audio_segment_completed', handleSegmentCompleted),
          listen<LongAudioSegmentFailedEvent>('long_audio_segment_failed', handleSegmentFailed),
          listen<LongAudioTaskCompletedEvent>('long_audio_task_completed', handleTaskCompleted),
        ]);
        
        unlistenFunctions.current = unlisteners;
      } catch (error) {
        console.error('Failed to setup event listeners:', error);
      }
    };

    setupEventListeners();

    return () => {
      unlistenFunctions.current.forEach(unlisten => unlisten());
    };
  }, []);

  // 开始处理
  useEffect(() => {
    startProcessing();
  }, []);

  const startProcessing = async () => {
    try {
      setIsPreprocessing(true);
      taskStartTime.current = Date.now();
      
      const taskId = await invoke<string>('create_long_audio_task', {
        recordId: record.id,
        filePath: record.filePath,
        config: {
          language: config.language,
          mode: config.model_mode,
          audioEnhancement: config.audio_enhancement,
        }
      });

      console.log('Long audio task created:', taskId);
    } catch (error) {
      console.error('Failed to create long audio task:', error);
      onError?.(error as string);
    }
  };

  const handlePreprocessing = useCallback((event: { payload: LongAudioPreprocessingEvent }) => {
    const { message } = event.payload;
    setPreprocessingMessage(message);
  }, []);

  const handleTaskCreated = useCallback(async (event: { payload: LongAudioTaskCreatedEvent }) => {
    const { task_id, message } = event.payload;
    
    setIsPreprocessing(false);
    setPreprocessingMessage(message);
    
    // 获取任务详情
    try {
      const taskDetails = await invoke<LongAudioTask>('get_long_audio_task', { taskId: task_id });
      if (taskDetails) {
        setTask(taskDetails);
        
        // 开始处理
        await invoke('start_long_audio_task', { taskId: task_id });
        console.log('Long audio processing started');
      }
    } catch (error) {
      console.error('Failed to get task details or start processing:', error);
      onError?.(error as string);
    }
  }, [onError]);

  const handleSegmentCompleted = useCallback((event: { payload: LongAudioSegmentCompletedEvent }) => {
    const { completed_segments, progress, segment_id, segment_text, processing_stats } = event.payload;
    
    // 更新任务进度
    setTask(prev => prev ? {
      ...prev,
      completed_segments,
      processing_stats,
      segments: prev.segments.map(seg => 
        seg.id === segment_id 
          ? { ...seg, status: 'Completed' as const, text: segment_text }
          : seg
      )
    } : null);

    // 更新流式文本显示
    // 更新流式文本显示 (暂时禁用)
    /*
    setCompletedSegments(prev => {
      const newSegment = { 
        id: segment_id, 
        text: segment_text,
        start_time: 0,
        end_time: 0,
        duration: 0,
        sample_start: 0,
        sample_end: 0,
        status: 'Completed' as const
      };
      const updated = [...prev, newSegment];
      
      // 按时间顺序排序并合并文本
      const sortedText = updated
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(seg => seg.text || '')
        .join(' ');
      setStreamingText(sortedText);
      
      return updated;
    });
    */

    // 报告进度
    onProgress?.(progress);
  }, [onProgress]);

  const handleSegmentFailed = useCallback((event: { payload: LongAudioSegmentFailedEvent }) => {
    const { segment_id, error } = event.payload;
    
    setTask(prev => prev ? {
      ...prev,
      failed_segments: prev.failed_segments + 1,
      segments: prev.segments.map(seg => 
        seg.id === segment_id 
          ? { ...seg, status: 'Failed' as const, error }
          : seg
      )
    } : null);

    console.warn(`Segment ${segment_id} failed:`, error);
  }, []);

  const handleTaskCompleted = useCallback((event: { payload: LongAudioTaskCompletedEvent }) => {
    const { final_text } = event.payload;
    
    const processingTime = (Date.now() - taskStartTime.current) / 1000;
    
    setTask(prev => prev ? {
      ...prev,
      status: 'Completed',
      final_text
    } : null);

    onComplete({
      text: final_text,
      processingTime
    });
  }, [onComplete]);

  const handlePause = async () => {
    if (task) {
      try {
        await invoke('pause_long_audio_task', { taskId: task.id });
        setTask(prev => prev ? { ...prev, status: 'Paused' } : null);
      } catch (error) {
        console.error('Failed to pause task:', error);
      }
    }
  };

  const handleResume = async () => {
    if (task) {
      try {
        await invoke('resume_long_audio_task', { taskId: task.id });
        setTask(prev => prev ? { ...prev, status: 'Processing' } : null);
      } catch (error) {
        console.error('Failed to resume task:', error);
      }
    }
  };

  const handleCancel = async () => {
    if (task) {
      try {
        await invoke('cancel_long_audio_task', { taskId: task.id });
        setTask(prev => prev ? { ...prev, status: 'Cancelled' } : null);
        onError?.('处理已取消');
      } catch (error) {
        console.error('Failed to cancel task:', error);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (speed: number): string => {
    if (speed === 0) return '计算中...';
    return `${speed.toFixed(1)}x`;
  };

  if (isPreprocessing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">正在预处理长音频</h3>
            <p className="text-sm text-gray-600">文件: {record.originalFileName}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-gray-700">{preprocessingMessage}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <ArrowPathIcon className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>正在初始化处理任务...</p>
        </div>
      </div>
    );
  }

  const progress = task.total_segments > 0 ? (task.completed_segments / task.total_segments) * 100 : 0;
  const isProcessing = task.status === 'Processing';
  const isPaused = task.status === 'Paused';
  const isCompleted = task.status === 'Completed';
  const isFailed = task.status === 'Failed';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* 头部信息 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isCompleted ? "bg-green-100" : isFailed ? "bg-red-100" : "bg-blue-100"
          )}>
            {isCompleted ? (
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            ) : isFailed ? (
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            ) : (
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">长音频转录处理</h3>
            <p className="text-sm text-gray-600">{record.originalFileName}</p>
            <p className="text-xs text-gray-500">
              总时长: {formatTime(task.total_duration)} | 共 {task.total_segments} 段
            </p>
          </div>
        </div>
        
        {/* 控制按钮 */}
        <div className="flex items-center gap-2">
          {isProcessing && (
            <button
              onClick={handlePause}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="暂停"
            >
              <PauseIcon className="w-5 h-5" />
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="继续"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          )}
          {(isProcessing || isPaused) && (
            <button
              onClick={handleCancel}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="取消"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            已完成 {task.completed_segments}/{task.total_segments} 段
            {task.failed_segments > 0 && (
              <span className="text-red-600 ml-2">({task.failed_segments} 段失败)</span>
            )}
          </span>
          <span className="font-medium text-gray-900">{progress.toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={cn(
              "h-3 rounded-full transition-all duration-500",
              isCompleted ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 处理统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-gray-500">处理速度</div>
            <div className="font-medium">
              {formatSpeed(task.processing_stats.average_processing_speed)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-gray-500">预计剩余</div>
            <div className="font-medium">
              {task.processing_stats.estimated_remaining_time 
                ? formatTime(task.processing_stats.estimated_remaining_time)
                : '计算中...'
              }
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <CpuChipIcon className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-gray-500">活跃线程</div>
            <div className="font-medium">{task.processing_stats.active_workers}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-gray-500">准确率</div>
            <div className="font-medium">
              {task.processing_stats.accuracy_estimate 
                ? `${(task.processing_stats.accuracy_estimate * 100).toFixed(1)}%`
                : '评估中...'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 流式文本显示 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">实时转录结果</h4>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
        
        <div className={cn(
          "bg-gray-50 rounded-lg p-4 text-sm leading-relaxed",
          isExpanded ? "max-h-96 overflow-y-auto" : "max-h-32 overflow-hidden"
        )}>
          {streamingText ? (
            <p className="text-gray-800 whitespace-pre-wrap">{streamingText}</p>
          ) : (
            <p className="text-gray-500 italic">等待转录结果...</p>
          )}
        </div>
      </div>

      {/* 完成状态信息 */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">转录完成！</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            总计处理了 {task.total_segments} 个音频段，
            用时 {formatTime((Date.now() - taskStartTime.current) / 1000)}
          </p>
        </div>
      )}

      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">处理失败</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            处理过程中遇到错误，请检查音频文件或重试
          </p>
        </div>
      )}
    </div>
  );
};

export default LongAudioProcessor;