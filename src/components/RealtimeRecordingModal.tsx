import React, { useState, useEffect, useRef } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  PauseIcon, 
  PlayIcon,
  Cog6ToothIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  // MusicalNoteIcon,
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { cn } from '../utils/cn';

interface RealtimeRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (config: RealtimeConfig) => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
}

interface RealtimeConfig {
  language: 'zh' | 'en' | 'auto';
  mode: 'streaming' | 'buffered' | 'hybrid';
  speakerDiarization: boolean;
  noiseReduction: boolean;
  autoSave: boolean;
  saveInterval: number; // minutes
}

interface RecordingState {
  status: 'idle' | 'recording' | 'paused' | 'processing';
  duration: number; // seconds
  segments: TranscriptSegment[];
  currentText: string;
  confidence: number;
  speakerCount: number;
}

interface TranscriptSegment {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  confidence: number;
  isTemporary: boolean;
}

const RealtimeRecordingModal: React.FC<RealtimeRecordingModalProps> = ({
  isOpen,
  onClose,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
}) => {
  const [config, setConfig] = useState<RealtimeConfig>({
    language: 'zh',
    mode: 'hybrid',
    speakerDiarization: true,
    noiseReduction: true,
    autoSave: true,
    saveInterval: 5,
  });

  const [recordingState, setRecordingState] = useState<RecordingState>({
    status: 'idle',
    duration: 0,
    segments: [],
    currentText: '',
    confidence: 0.95,
    speakerCount: 1,
  });

  const [audioLevel] = useState(0);
  // const [showAdvanced, setShowAdvanced] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 格式化录音时长
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取状态颜色
  const getStatusColor = (status: RecordingState['status']) => {
    switch (status) {
      case 'recording': return 'text-red-600 bg-red-50';
      case 'paused': return 'text-yellow-600 bg-yellow-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 主要操作按钮
  const handleMainAction = () => {
    switch (recordingState.status) {
      case 'idle':
        onStartRecording(config);
        setRecordingState(prev => ({ ...prev, status: 'recording' }));
        break;
      case 'recording':
        onPauseRecording();
        setRecordingState(prev => ({ ...prev, status: 'paused' }));
        break;
      case 'paused':
        onResumeRecording();
        setRecordingState(prev => ({ ...prev, status: 'recording' }));
        break;
    }
  };

  const handleStop = () => {
    onStopRecording();
    setRecordingState(prev => ({ ...prev, status: 'processing' }));
  };

  // 滚动到最新内容
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [recordingState.segments, recordingState.currentText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-macos-md bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <MicrophoneIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">实时语音识别</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  getStatusColor(recordingState.status)
                )}>
                  {recordingState.status === 'idle' && '准备就绪'}
                  {recordingState.status === 'recording' && '正在录音'}
                  {recordingState.status === 'paused' && '已暂停'}
                  {recordingState.status === 'processing' && '处理中'}
                </span>
                <span className="text-text-secondary">•</span>
                <span className="text-text-secondary font-mono">
                  {formatDuration(recordingState.duration)}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="macos-toolbar-button"
            disabled={recordingState.status === 'recording'}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧配置面板 */}
          <div className="w-80 border-r border-border-secondary/50 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* 录音控制 */}
              <div className="macos-card">
                <div className="macos-section-header">
                  <MicrophoneIcon className="w-5 h-5 text-macos-blue" />
                  <span className="macos-section-title">录音控制</span>
                </div>
                
                {/* 音量可视化 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SpeakerWaveIcon className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-secondary">输入音量</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-75"
                      style={{ width: `${audioLevel * 100}%` }}
                    />
                  </div>
                </div>

                {/* 主要控制按钮 */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleMainAction}
                    className={cn(
                      "flex-1 macos-action-button flex items-center justify-center gap-2 py-3",
                      recordingState.status === 'recording' && "bg-gradient-to-br from-yellow-500 to-orange-600"
                    )}
                    disabled={recordingState.status === 'processing'}
                  >
                    {recordingState.status === 'idle' && (
                      <>
                        <MicrophoneIcon className="w-5 h-5" />
                        <span>开始录音</span>
                      </>
                    )}
                    {recordingState.status === 'recording' && (
                      <>
                        <PauseIcon className="w-5 h-5" />
                        <span>暂停</span>
                      </>
                    )}
                    {recordingState.status === 'paused' && (
                      <>
                        <PlayIcon className="w-5 h-5" />
                        <span>继续</span>
                      </>
                    )}
                    {recordingState.status === 'processing' && (
                      <>
                        <div className="spinner w-5 h-5" />
                        <span>处理中</span>
                      </>
                    )}
                  </button>
                  
                  {recordingState.status !== 'idle' && (
                    <button 
                      onClick={handleStop}
                      className="macos-button px-4 py-3"
                      disabled={recordingState.status === 'processing'}
                    >
                      <StopIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 识别设置 */}
              <div className="macos-card">
                <div className="macos-section-header">
                  <Cog6ToothIcon className="w-5 h-5 text-macos-blue" />
                  <span className="macos-section-title">识别设置</span>
                </div>
                
                <div className="space-y-4">
                  {/* 语言选择 */}
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      识别语言
                    </label>
                    <div className="macos-segmented-control">
                      <div 
                        className={cn(
                          "macos-segmented-option",
                          config.language === 'zh' && "active"
                        )}
                        onClick={() => setConfig(prev => ({ ...prev, language: 'zh' }))}
                      >
                        中文
                      </div>
                      <div 
                        className={cn(
                          "macos-segmented-option",
                          config.language === 'en' && "active"
                        )}
                        onClick={() => setConfig(prev => ({ ...prev, language: 'en' }))}
                      >
                        English
                      </div>
                      <div 
                        className={cn(
                          "macos-segmented-option",
                          config.language === 'auto' && "active"
                        )}
                        onClick={() => setConfig(prev => ({ ...prev, language: 'auto' }))}
                      >
                        自动
                      </div>
                    </div>
                  </div>

                  {/* 识别模式 */}
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      识别模式
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'streaming', label: '流式输出', desc: '边说边显示，延迟最低' },
                        { value: 'buffered', label: '缓冲模式', desc: '句子完整后显示，准确度更高' },
                        { value: 'hybrid', label: '混合模式', desc: '临时结果+最终确认' }
                      ].map(mode => (
                        <label key={mode.value} className="flex items-start gap-3 p-2 rounded-macos-md hover:bg-surface-hover transition-colors cursor-pointer">
                          <input 
                            type="radio"
                            name="mode"
                            value={mode.value}
                            checked={config.mode === mode.value}
                            onChange={(e) => setConfig(prev => ({ ...prev, mode: e.target.value as any }))}
                            className="mt-0.5 w-4 h-4 text-macos-blue focus:ring-macos-blue"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-primary">{mode.label}</div>
                            <div className="text-xs text-text-secondary">{mode.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 功能开关 */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-2 rounded-macos-md hover:bg-surface-hover transition-colors cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={config.speakerDiarization}
                        onChange={(e) => setConfig(prev => ({ ...prev, speakerDiarization: e.target.checked }))}
                        className="w-4 h-4 rounded border-border-secondary text-macos-blue focus:ring-macos-blue"
                      />
                      <span className="text-sm font-medium text-text-primary">说话人识别</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-2 rounded-macos-md hover:bg-surface-hover transition-colors cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={config.noiseReduction}
                        onChange={(e) => setConfig(prev => ({ ...prev, noiseReduction: e.target.checked }))}
                        className="w-4 h-4 rounded border-border-secondary text-macos-blue focus:ring-macos-blue"
                      />
                      <span className="text-sm font-medium text-text-primary">噪声抑制</span>
                    </label>
                    
                    <label className="flex items-center gap-3 p-2 rounded-macos-md hover:bg-surface-hover transition-colors cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={config.autoSave}
                        onChange={(e) => setConfig(prev => ({ ...prev, autoSave: e.target.checked }))}
                        className="w-4 h-4 rounded border-border-secondary text-macos-blue focus:ring-macos-blue"
                      />
                      <span className="text-sm font-medium text-text-primary">自动保存</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 录音统计 */}
              <div className="macos-card">
                <div className="macos-section-header">
                  <DocumentTextIcon className="w-5 h-5 text-macos-blue" />
                  <span className="macos-section-title">实时统计</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-macos-blue">
                      {recordingState.segments.length}
                    </div>
                    <div className="text-xs text-text-secondary">语句段落</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-macos-green">
                      {recordingState.speakerCount}
                    </div>
                    <div className="text-xs text-text-secondary">说话人数</div>
                  </div>
                  
                  <div className="text-center col-span-2">
                    <div className={cn(
                      "text-2xl font-bold",
                      getConfidenceColor(recordingState.confidence)
                    )}>
                      {(recordingState.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-text-secondary">平均准确率</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧转录显示区域 */}
          <div className="flex-1 flex flex-col">
            {/* 转录内容 */}
            <div 
              ref={scrollRef}
              className="flex-1 p-6 overflow-y-auto bg-gray-50/50"
            >
              {recordingState.segments.length === 0 && !recordingState.currentText ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MicrophoneIcon className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    准备开始录音
                  </h3>
                  <p className="text-text-secondary max-w-md">
                    点击"开始录音"按钮开始实时语音识别。支持中英文混合识别和多人对话场景。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 已确认的转录段落 */}
                  {recordingState.segments.map((segment) => (
                    <div 
                      key={segment.id}
                      className={cn(
                        "p-4 rounded-macos-md",
                        segment.isTemporary 
                          ? "bg-blue-50 border border-blue-200" 
                          : "bg-white border border-border-secondary/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                          segment.speaker === 'Speaker 1' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {segment.speaker?.charAt(segment.speaker.length - 1) || '1'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-text-primary">
                              {segment.speaker || 'Speaker 1'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {new Date(segment.timestamp).toLocaleTimeString()}
                            </span>
                            <div className="flex items-center gap-1">
                              {segment.confidence >= 0.9 ? (
                                <CheckCircleIcon className="w-3 h-3 text-green-500" />
                              ) : (
                                <ExclamationCircleIcon className="w-3 h-3 text-yellow-500" />
                              )}
                              <span className={cn(
                                "text-xs",
                                getConfidenceColor(segment.confidence)
                              )}>
                                {(segment.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            segment.isTemporary ? "text-blue-800" : "text-text-primary"
                          )}>
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 当前正在识别的文本 */}
                  {recordingState.currentText && (
                    <div className="p-4 rounded-macos-md bg-yellow-50 border border-yellow-200 border-dashed">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-yellow-800 mb-1">
                            正在识别...
                          </div>
                          <p className="text-sm text-yellow-700 leading-relaxed">
                            {recordingState.currentText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部状态栏 */}
            <div className="border-t border-border-secondary/50 px-6 py-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>
                    总时长: {formatDuration(recordingState.duration)}
                  </span>
                  <span>•</span>
                  <span>
                    字数: {recordingState.segments.reduce((acc, seg) => acc + seg.text.length, 0) + recordingState.currentText.length}
                  </span>
                  {config.speakerDiarization && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <UserGroupIcon className="w-4 h-4" />
                        {recordingState.speakerCount} 位说话人
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {recordingState.status !== 'idle' && (
                    <button 
                      className="macos-button"
                      onClick={() => {/* 导出功能 */}}
                    >
                      导出转录
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="macos-button"
                    disabled={recordingState.status === 'recording'}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeRecordingModal;