import React from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  PauseIcon, 
  PlayIcon,
  SpeakerWaveIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../utils/cn';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioLevel: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onSettings: () => void;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  recordingTime,
  audioLevel,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onSettings,
}) => {
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
            isActive ? "bg-macos-green" : "bg-border-secondary",
            i < 8 ? "h-2" : i < 10 ? "h-3 bg-macos-yellow" : "h-4 bg-macos-red"
          )}
        />
      );
    });
    
    return bars;
  };

  return (
    <div className="macos-card">
      <div className="macos-section-header">
        <MicrophoneIcon className="w-5 h-5 text-macos-blue" />
        <span className="macos-section-title">实时录音</span>
        <button 
          className="ml-auto macos-toolbar-button"
          onClick={onSettings}
          title="录音设置"
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Recording Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isRecording && !isPaused ? "bg-macos-red animate-pulse" : 
            isPaused ? "bg-macos-yellow" : "bg-border-secondary"
          )} />
          <span className="text-sm font-medium text-text-primary">
            {isRecording ? (isPaused ? "录音已暂停" : "正在录音") : "准备录音"}
          </span>
        </div>
        
        {/* Recording Time */}
        <div className="font-mono text-lg font-medium text-text-primary tabular-nums">
          {formatTime(recordingTime)}
        </div>
      </div>

      {/* Audio Level Visualization */}
      {isRecording && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <SpeakerWaveIcon className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">音频电平</span>
          </div>
          <div className="flex items-end gap-1 h-6">
            {getAudioLevelBars()}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isRecording ? (
          <button
            className="macos-action-button flex-1"
            onClick={onStartRecording}
          >
            <MicrophoneIconSolid className="w-5 h-5" />
            <span>开始录音</span>
          </button>
        ) : (
          <>
            <button
              className="macos-button flex-1"
              onClick={isPaused ? onResumeRecording : onPauseRecording}
            >
              {isPaused ? (
                <>
                  <PlayIcon className="w-4 h-4" />
                  <span>继续</span>
                </>
              ) : (
                <>
                  <PauseIcon className="w-4 h-4" />
                  <span>暂停</span>
                </>
              )}
            </button>
            <button
              className="macos-button-destructive flex-1"
              onClick={onStopRecording}
            >
              <StopIcon className="w-4 h-4" />
              <span>停止</span>
            </button>
          </>
        )}
      </div>

      {/* Real-time Transcription Status */}
      {isRecording && (
        <div className="mt-4 p-3 bg-surface-secondary rounded-macos-md">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-text-secondary">实时转录已启用</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordingControls;