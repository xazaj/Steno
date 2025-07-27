import React from 'react';
import {
  MicrophoneIcon,
  StopIcon,
  PauseIcon,
  PlayIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface GlobalRecordingIndicatorProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  className?: string;
}

const GlobalRecordingIndicator: React.FC<GlobalRecordingIndicatorProps> = ({
  isRecording,
  isPaused,
  duration,
  audioLevel,
  onStop,
  onPause,
  onResume,
  className
}) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording && !isPaused) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-40 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden",
      className
    )}>
      {/* 录音状态指示条 */}
      <div className={cn(
        "h-1 w-full",
        isRecording ? "bg-red-500" : "bg-yellow-500"
      )}>
        {isRecording && (
          <div 
            className="h-full bg-red-600 transition-all duration-150"
            style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
          />
        )}
      </div>

      <div className="p-4 flex items-center gap-4">
        {/* 状态图标和信息 */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isRecording 
              ? "bg-red-100 text-red-600" 
              : "bg-yellow-100 text-yellow-600"
          )}>
            <MicrophoneIcon className={cn(
              "w-5 h-5",
              isRecording && "animate-pulse"
            )} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium",
                isRecording ? "text-red-700" : "text-yellow-700"
              )}>
                {isRecording ? "正在录音" : "录音已暂停"}
              </span>
              {isRecording && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <ClockIcon className="w-3 h-3" />
              <span>{formatDuration(duration)}</span>
              <span className="mx-2">•</span>
              <span>⌘⇧R 停止</span>
              <span className="mx-1">•</span>
              <span>空格 {isRecording ? '暂停' : '继续'}</span>
            </div>
          </div>
        </div>

        {/* 音频级别可视化 */}
        {isRecording && (
          <div className="flex items-center gap-1 px-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full transition-all duration-150",
                  audioLevel * 5 > i 
                    ? "h-6 bg-red-500" 
                    : "h-2 bg-gray-300"
                )}
              />
            ))}
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          {isRecording ? (
            <button
              onClick={onPause}
              className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
              title="暂停录音"
            >
              <PauseIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onResume}
              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              title="继续录音"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={onStop}
            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            title="停止录音"
          >
            <StopIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalRecordingIndicator;