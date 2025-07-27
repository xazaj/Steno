import React, { useState, useEffect } from 'react';
import {
  MicrophoneIcon,
  StopIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  ClockIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneIconSolid } from '@heroicons/react/24/solid';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { cn } from '../../utils/cn';
import ConversationView from '../ConversationView';
import AudioWaveform from '../AudioWaveform';

interface RecordingWorkspaceProps {
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  onModeSwitch: (mode: 'file' | 'recording', reason?: string) => void;
}

interface RealtimeSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

interface RealtimeConfig {
  language: string;
  mode: string;
  speaker_diarization: boolean;
  noise_reduction: boolean;
  auto_save: boolean;
  save_interval: number;
}

interface RecognitionResult {
  text: string;
  confidence: number;
  is_temporary: boolean;
  speaker?: string;
  timestamp: number;
}

interface AudioLevelUpdate {
  level: number;
  timestamp: number;
}

const RecordingWorkspace: React.FC<RecordingWorkspaceProps> = ({
  selectedProject: _selectedProject,
  onProjectSelect: _onProjectSelect,
  onModeSwitch,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [realtimeSegments, setRealtimeSegments] = useState<RealtimeSegment[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [participants, setParticipants] = useState(1);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [forceStopRequested, setForceStopRequested] = useState(false);

  // 录音计时器
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // 监听实时转录事件
  useEffect(() => {
    let unsubscribeAudioLevel: (() => void) | undefined;
    let unsubscribeRecognition: (() => void) | undefined;
    let unsubscribeError: (() => void) | undefined;
    let unsubscribeStop: (() => void) | undefined;

    const setupEventListeners = async () => {
      try {
        // 监听音频音量更新
        unsubscribeAudioLevel = await listen<AudioLevelUpdate>('audio_level', (event) => {
          setAudioLevel(event.payload.level);
        });

        // 监听识别结果
        unsubscribeRecognition = await listen<RecognitionResult>('recognition_result', (event) => {
          const result = event.payload;
          
          if (result.is_temporary) {
            // 临时结果，更新当前转录文本
            setCurrentTranscript(result.text);
          } else {
            // 最终结果，添加到段落列表
            const newSegment: RealtimeSegment = {
              id: Date.now().toString(),
              speaker: result.speaker || 'Speaker 1',
              text: result.text,
              timestamp: result.timestamp,
              confidence: result.confidence
            };
            
            setRealtimeSegments(prev => [...prev, newSegment]);
            setCurrentTranscript(''); // 清空临时文本
          }
        });

        // 监听录音错误
        unsubscribeError = await listen<string>('recording_error', (event) => {
          console.error('Recording error:', event.payload);
          setIsRecording(false);
          setIsProcessing(false);
        });

        // 监听录音停止事件
        unsubscribeStop = await listen('recording_stopped', () => {
          console.log('Recording stopped event received');
          setIsRecording(false);
          setIsPaused(false);
          setIsProcessing(false);
          setForceStopRequested(false);
        });

      } catch (error) {
        console.error('Failed to setup event listeners:', error);
      }
    };

    setupEventListeners();

    return () => {
      if (unsubscribeAudioLevel) unsubscribeAudioLevel();
      if (unsubscribeRecognition) unsubscribeRecognition();
      if (unsubscribeError) unsubscribeError();
      if (unsubscribeStop) unsubscribeStop();
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setIsProcessing(true);
      
      // 创建实时录音配置
      const config: RealtimeConfig = {
        language: 'zh', // 中文
        mode: 'streaming', // 流式模式
        speaker_diarization: true, // 说话人识别
        noise_reduction: true, // 噪音降低
        auto_save: true, // 自动保存
        save_interval: 5 // 5分钟保存一次
      };

      // 启动实时录音
      await invoke('start_realtime_recording', { config });
      
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setRealtimeSegments([]);
      setCurrentTranscript('');
      setIsProcessing(false);
      
      if (!sessionName) {
        const now = new Date();
        setSessionName(`会议记录_${now.getMonth()+1}月${now.getDate()}日_${now.getHours()}时${now.getMinutes()}分`);
      }
      
      console.log('实时录音已启动');
    } catch (error) {
      console.error('启动录音失败:', error);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      
      // 停止实时录音
      await invoke('stop_realtime_recording');
      
      // 重置所有状态
      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(false);
      setRecordingTime(0);
      setAudioLevel(0);
      setCurrentTranscript('');
      
      console.log('实时录音已停止');
      
      // 可选：显示停止成功的提示
      // 这里可以添加toast通知或其他用户反馈
      
    } catch (error) {
      console.error('停止录音失败:', error);
      setIsProcessing(false);
      
      // 即使停止失败，也要重置前端状态，防止UI卡住
      setTimeout(() => {
        setIsRecording(false);
        setIsPaused(false); 
        setIsProcessing(false);
        console.warn('强制重置录音状态');
      }, 2000);
    }
  };

  const handlePauseRecording = async () => {
    try {
      if (isPaused) {
        // 恢复录音
        await invoke('resume_realtime_recording');
        setIsPaused(false);
        console.log('录音已恢复');
      } else {
        // 暂停录音
        await invoke('pause_realtime_recording');
        setIsPaused(true);
        console.log('录音已暂停');
      }
    } catch (error) {
      console.error('暂停/恢复录音失败:', error);
    }
  };

  // 紧急停止功能
  const handleForceStop = () => {
    setForceStopRequested(true);
    
    // 立即重置前端状态
    setIsRecording(false);
    setIsPaused(false);
    setIsProcessing(false);
    setRecordingTime(0);
    setAudioLevel(0);
    setCurrentTranscript('');
    
    // 尝试停止后端录音
    invoke('stop_realtime_recording')
      .then(() => {
        console.log('紧急停止成功');
      })
      .catch((error) => {
        console.error('紧急停止后端录音失败:', error);
      })
      .finally(() => {
        setForceStopRequested(false);
      });
  };

  const getAudioLevelBars = () => {
    const bars = Array.from({ length: 12 }, (_, i) => {
      const threshold = (i + 1) / 12;
      const isActive = audioLevel > threshold;
      
      return (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-75",
            isActive ? "bg-green-500" : "bg-gray-300",
            i < 8 ? "h-2" : i < 10 ? "h-3 bg-yellow-500" : "h-4 bg-red-500"
          )}
        />
      );
    });
    
    return bars;
  };

  const currentTranscription = [
    ...realtimeSegments.map(segment => `${segment.speaker}：${segment.text}`),
    ...(currentTranscript ? [`正在识别：${currentTranscript}`] : [])
  ].join('\n');

  return (
    <div className="flex-1 flex">
      {/* Left Panel: Recording Controls */}
      <div className="w-96 border-r border-gray-200 bg-white/40 backdrop-blur-sm flex flex-col">
        {/* Recording Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <MicrophoneIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">实时录音</h2>
          </div>
          
          {/* Session Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              会话名称
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="输入会话名称..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isRecording}
            />
          </div>

          {/* Participants */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参与人数
            </label>
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-gray-500" />
              <select
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isRecording}
              >
                <option value={1}>1人（单人录音）</option>
                <option value={2}>2人对话</option>
                <option value={3}>3人讨论</option>
                <option value={4}>4人会议</option>
                <option value={5}>5人以上</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recording Status */}
        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isRecording && !isPaused ? "bg-red-500 animate-pulse" : 
                  isPaused ? "bg-yellow-500" : "bg-gray-300"
                )} />
                <span className="text-sm font-medium text-gray-900">
                  {isRecording ? (isPaused ? "录音已暂停" : "正在录音") : "准备录音"}
                </span>
              </div>
              
              <div className="font-mono text-xl font-bold text-gray-900 tabular-nums">
                {formatTime(recordingTime)}
              </div>
            </div>

            {/* Audio Level */}
            {isRecording && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <SpeakerWaveIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">音频电平</span>
                </div>
                <div className="flex items-end gap-1 h-6">
                  {getAudioLevelBars()}
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="space-y-2">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MicrophoneIconSolid className="w-5 h-5" />
                  <span>{isProcessing ? '启动中...' : '开始录音'}</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handlePauseRecording}
                    className="flex-1 bg-yellow-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
                    <span>{isPaused ? '继续' : '暂停'}</span>
                  </button>
                  <button
                    onClick={handleStopRecording}
                    disabled={isProcessing}
                    className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <StopIcon className="w-4 h-4" />
                    <span>{isProcessing ? '停止中...' : '停止'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {isRecording && (
            <div className="space-y-2">
              <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                <ShareIcon className="w-4 h-4" />
                <span>实时分享</span>
              </button>
              
              {/* 紧急停止按钮 - 仅在处理状态时显示 */}
              {(isProcessing || forceStopRequested) && (
                <button
                  onClick={handleForceStop}
                  disabled={forceStopRequested}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 border border-red-300 disabled:opacity-50"
                >
                  <StopIcon className="w-4 h-4" />
                  <span>{forceStopRequested ? '强制停止中...' : '紧急停止'}</span>
                </button>
              )}
            </div>
          )}

          {/* Recording Tips */}
          {!isRecording && (
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <LightBulbIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">录音小贴士</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 确保环境安静，减少背景噪音</li>
                    <li>• 说话清晰，语速适中</li>
                    <li>• 多人对话时轮流发言效果更好</li>
                    <li>• 支持实时转录和智能分析</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="p-6 pt-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-3">音频波形</h4>
              <AudioWaveform
                isRecording={isRecording && !isPaused}
                height={80}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Real-time Transcription */}
      <div className="flex-1 flex flex-col">
        {isRecording || realtimeSegments.length > 0 ? (
          <>
            {/* Session Info Bar */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{formatTime(recordingTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{participants}人参与</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      已识别 {realtimeSegments.length} 条内容
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-600 font-medium">实时转录中</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transcription Content */}
            <div className="flex-1">
              <ConversationView
                resultText={currentTranscription}
                hasResult={realtimeSegments.length > 0}
                isRecognizing={isRecording}
                onCopy={() => {}}
                onClear={() => setRealtimeSegments([])}
                onExport={() => {}}
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MicrophoneIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                开始实时录音
              </h3>
              <p className="text-gray-600 mb-6">
                点击录音按钮开始，可以实时看到转录结果。支持多人对话识别和智能分析。
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MicrophoneIconSolid className="w-5 h-5" />
                  <span>{isProcessing ? '启动中...' : '开始录音'}</span>
                </button>
                <button
                  onClick={() => onModeSwitch('file', '尝试文件模式')}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  或者上传音频文件进行转录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingWorkspace;