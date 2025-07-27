import React from 'react';
import { MagnifyingGlassIcon, ClipboardIcon, TrashIcon, ChatBubbleLeftRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime?: number;
  endTime?: number;
}

interface ConversationViewProps {
  resultText: string;
  hasResult: boolean;
  isRecognizing: boolean;
  onCopy: () => void;
  onClear: () => void;
  onExport?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  resultText,
  hasResult,
  isRecognizing,
  onCopy,
  onClear,
  onExport,
}) => {
  // 解析对话文本，提取说话人信息
  const parseConversation = (text: string): SpeakerSegment[] => {
    if (!text) return [];
    
    const segments: SpeakerSegment[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // 匹配格式：说话人A：内容
      const match = line.match(/^(说话人[A-Z]|Speaker [A-Z])：(.+)$/);
      if (match) {
        segments.push({
          speaker: match[1],
          text: match[2].trim(),
        });
      } else if (line.trim()) {
        // 如果没有说话人标识，作为普通文本处理
        segments.push({
          speaker: 'Unknown',
          text: line.trim(),
        });
      }
    }
    
    return segments;
  };

  const getSpeakerClass = (speaker: string): string => {
    if (speaker.includes('A') || speaker.includes('1')) return 'speaker-a';
    if (speaker.includes('B') || speaker.includes('2')) return 'speaker-b';
    if (speaker.includes('C') || speaker.includes('3')) return 'speaker-c';
    if (speaker.includes('D') || speaker.includes('4')) return 'speaker-d';
    return 'speaker-a'; // default
  };

  const getSpeakerAvatar = (speaker: string): string => {
    if (speaker.includes('A') || speaker.includes('1')) return 'A';
    if (speaker.includes('B') || speaker.includes('2')) return 'B';
    if (speaker.includes('C') || speaker.includes('3')) return 'C';
    if (speaker.includes('D') || speaker.includes('4')) return 'D';
    return 'A'; // default
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const segments = parseConversation(resultText);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="macos-card flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center px-4 py-3 border-b border-border-primary/50 bg-gradient-to-b from-gray-50/80 to-gray-100/60 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-macos-blue" />
            <span className="font-semibold text-sm text-text-primary">对话转录</span>
          </div>
          <div className="flex gap-1">
            <button className="macos-toolbar-button" onClick={() => {}}>
              <MagnifyingGlassIcon className="w-3.5 h-3.5" />
            </button>
            <button 
              className="macos-toolbar-button" 
              onClick={onCopy}
              disabled={!hasResult}
              title="复制"
            >
              <ClipboardIcon className="w-3.5 h-3.5" />
            </button>
            {onExport && (
              <button 
                className="macos-toolbar-button" 
                onClick={onExport}
                disabled={!hasResult}
                title="导出"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button 
              className="macos-toolbar-button" 
              onClick={onClear}
              disabled={!hasResult}
              title="清除"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 macos-scrollbar min-h-0">
          {isRecognizing ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm text-text-secondary">正在识别语音内容，请稍候...</span>
              </div>
            </div>
          ) : !hasResult ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-macos-blue/20 mb-3" />
              <div className="font-medium mb-1 text-text-primary text-sm">识别结果将在此显示</div>
              <div className="text-xs text-text-secondary">
                选择音频文件并开始处理
              </div>
            </div>
          ) : segments.length > 0 ? (
            <div className="space-y-3">
              {segments.map((segment, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "macos-speaker-message-compact",
                    getSpeakerClass(segment.speaker)
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn(
                      "macos-speaker-avatar-compact",
                      getSpeakerClass(segment.speaker)
                    )}>
                      {getSpeakerAvatar(segment.speaker)}
                    </div>
                    <span className="font-medium text-sm text-text-primary">{segment.speaker}</span>
                    {segment.startTime && segment.endTime && (
                      <span className="text-xs text-text-secondary font-mono ml-auto">
                        [{formatTime(segment.startTime)} - {formatTime(segment.endTime)}]
                      </span>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed text-text-primary pl-6">
                    {segment.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-macos-blue/20 mb-3" />
              <div className="font-medium mb-1 text-text-primary text-sm">识别完成</div>
              <div className="text-xs text-text-secondary mb-3">
                {resultText || '没有识别到有效内容'}
              </div>
              {resultText && (
                <div className="w-full p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto text-xs leading-relaxed text-left macos-scrollbar">
                  {resultText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;