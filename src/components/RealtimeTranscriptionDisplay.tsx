import React, { useEffect, useRef } from 'react';
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface TranscriptSegment {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  confidence: number;
  isTemporary: boolean;
}

interface RealtimeTranscriptionDisplayProps {
  segments: TranscriptSegment[];
  currentText: string;
  duration: number;
  speakerCount: number;
  isRecording: boolean;
  className?: string;
}

const RealtimeTranscriptionDisplay: React.FC<RealtimeTranscriptionDisplayProps> = ({
  segments,
  currentText,
  duration,
  speakerCount,
  isRecording,
  className
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, currentText]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSpeakerColor = (speaker?: string) => {
    if (!speaker) return 'bg-gray-500';
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500'
    ];
    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* 头部信息 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            isRecording 
              ? "bg-red-100 text-red-700" 
              : "bg-gray-100 text-gray-700"
          )}>
            <MicrophoneIcon className={cn(
              "w-4 h-4",
              isRecording && "animate-pulse"
            )} />
            {isRecording ? '实时录音中' : '录音已停止'}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <ClockIcon className="w-4 h-4" />
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <span>{speakerCount} 位说话人</span>
          </div>
          <div className="flex items-center gap-1">
            <SpeakerWaveIcon className="w-4 h-4" />
            <span>{segments.length} 个片段</span>
          </div>
        </div>
      </div>

      {/* 转录内容区域 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {segments.length === 0 && !currentText && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MicrophoneIcon className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">等待语音输入</p>
            <p className="text-sm text-center">
              开始说话，系统会自动识别并显示转录内容
            </p>
          </div>
        )}

        {/* 已确认的片段 */}
        {segments.map((segment) => (
          <div key={segment.id} className="flex gap-3 group">
            {/* 说话人头像 */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
              getSpeakerColor(segment.speaker)
            )}>
              {segment.speaker ? segment.speaker.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {segment.speaker || '未知说话人'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(segment.timestamp)}
                </span>
                <div className="flex items-center gap-1">
                  <CheckCircleIcon className={cn(
                    "w-3 h-3",
                    getConfidenceColor(segment.confidence)
                  )} />
                  <span className={cn(
                    "text-xs",
                    getConfidenceColor(segment.confidence)
                  )}>
                    {Math.round(segment.confidence * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 group-hover:bg-gray-100 transition-colors">
                <p className="text-gray-900 leading-relaxed">{segment.text}</p>
              </div>
            </div>
          </div>
        ))}

        {/* 当前临时文本 */}
        {currentText && (
          <div className="flex gap-3 opacity-75">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 animate-pulse">
              <MicrophoneIcon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">
                  正在识别...
                </span>
                <div className="flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600">临时</span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 border-dashed">
                <p className="text-gray-800 leading-relaxed italic">
                  {currentText}
                  <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部统计信息 */}
      {(segments.length > 0 || currentText) && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>总计 {segments.length} 个确认片段</span>
              {currentText && <span>1 个待确认片段</span>}
            </div>
            <div className="flex items-center gap-2">
              <span>平均准确度:</span>
              <span className={cn(
                "font-medium",
                segments.length > 0 
                  ? getConfidenceColor(
                      segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
                    )
                  : "text-gray-500"
              )}>
                {segments.length > 0 
                  ? Math.round((segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeTranscriptionDisplay;