import React from 'react';
import { PlayIcon, ArrowPathIcon, MusicalNoteIcon, Cog6ToothIcon, CpuChipIcon, ScissorsIcon, DocumentTextIcon, CheckIcon, ClockIcon } from '@heroicons/react/24/outline';

interface RecognitionProgress {
  stage: string;
  progress: number;
  message: string;
}

interface StatusBarProps {
  isRecognizing: boolean;
  recognitionProgress: RecognitionProgress | null;
  actualProgress: number;
}

const StatusBar: React.FC<StatusBarProps> = ({
  isRecognizing,
  recognitionProgress,
  actualProgress,
}) => {
  const getStatusIcon = (stage: string) => {
    switch (stage) {
      case 'initializing':
        return <PlayIcon className="w-4 h-4" />;
      case 'converting':
        return <ArrowPathIcon className="w-4 h-4" />;
      case 'converting_wav':
        return <MusicalNoteIcon className="w-4 h-4" />;
      case 'preparing':
        return <Cog6ToothIcon className="w-4 h-4" />;
      case 'processing':
        return <CpuChipIcon className="w-4 h-4" />;
      case 'segment_processing':
        return <ScissorsIcon className="w-4 h-4" />;
      case 'post_processing':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'completing':
        return <CheckIcon className="w-4 h-4" />;
      default:
        return <ArrowPathIcon className="w-4 h-4" />;
    }
  };

  const getStatusMessage = (progress: RecognitionProgress | null): string => {
    if (!progress) {
      return isRecognizing ? '正在处理音频文件...' : '准备就绪';
    }
    
    return progress.message || '正在处理...';
  };

  const calculateRemainingTime = (progress: number): number => {
    if (progress <= 0) return 0;
    if (progress >= 100) return 0;
    
    // 简单的时间估算算法
    const elapsed = 10; // 假设已经处理了10秒
    const totalEstimated = (elapsed / progress) * 100;
    return Math.max(0, totalEstimated - elapsed);
  };

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '完成';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const remainingTime = calculateRemainingTime(actualProgress);

  if (!isRecognizing && !recognitionProgress) {
    return (
      <div className="flex-1 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <CheckIcon className="w-4 h-4 text-macos-green" />
          <span>准备就绪 - 选择音频文件开始处理</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <span className="text-macos-blue">
          {getStatusIcon(recognitionProgress?.stage || '')}
        </span>
        <span>{getStatusMessage(recognitionProgress)}</span>
      </div>
      
      <div className="flex-1 h-1.5 bg-border-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-macos-blue to-macos-green rounded-full transition-all duration-200 relative"
          style={{ width: `${Math.max(0, Math.min(100, actualProgress))}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
        </div>
      </div>
      
      <div className="font-mono text-sm font-semibold text-text-primary min-w-[40px] text-right tabular-nums">
        {Math.round(actualProgress)}%
      </div>
      
      <div className="flex items-center gap-1 text-sm text-text-secondary">
        <ClockIcon className="w-4 h-4" />
        <span>剩余 {formatTime(remainingTime)}</span>
      </div>
    </div>
  );
};

export default StatusBar;