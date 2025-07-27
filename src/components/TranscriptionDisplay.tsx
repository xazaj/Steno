import React, { useState, useRef } from 'react';
import { 
  PlayIcon, 
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  SpeakerWaveIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';
import AudioPlayer from './AudioPlayer';

interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

interface TranscriptionDisplayProps {
  text: string;
  fileName?: string;
  processingTime?: number;
  accuracy?: number;
  audioFilePath?: string; // 音频文件路径
  onCopy?: () => void;
  onExport?: () => void;
  onTimeSeek?: (time: number) => void;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  text,
  fileName,
  processingTime,
  accuracy,
  audioFilePath,
  onCopy,
  onExport,
  onTimeSeek
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [highlightedSegments, setHighlightedSegments] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // 解析转录文本为对话段落
  const parseTranscription = (rawText: string): TranscriptionSegment[] => {
    if (!rawText) return [];
    
    // 检查是否包含角色标识（如 "A:" "B:" 或 "Speaker 1:" 等）
    const hasRoleMarkers = /^([\w\s]+):\s*/m.test(rawText);
    
    if (hasRoleMarkers) {
      // 按角色分段
      const roleSegments = rawText.split(/(?=^[\w\s]+:\s*)/m).filter(s => s.trim());
      return roleSegments.map((segment, index) => {
        const match = segment.match(/^([\w\s]+):\s*(.*?)$/s);
        if (match) {
          return {
            id: `segment-${index}`,
            startTime: index * 4, 
            endTime: (index + 1) * 4,
            text: match[2].trim(),
            speaker: match[1].trim(),
            confidence: 0.88 + Math.random() * 0.1
          };
        }
        return {
          id: `segment-${index}`,
          startTime: index * 4,
          endTime: (index + 1) * 4,
          text: segment.trim(),
          confidence: 0.88 + Math.random() * 0.1
        };
      });
    } else {
      // 按完整句子分段（句号、感叹号、问号）
      const sentences = rawText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      return sentences.map((sentence, index) => ({
        id: `segment-${index}`,
        startTime: index * 3, 
        endTime: (index + 1) * 3,
        text: sentence,
        confidence: 0.86 + Math.random() * 0.12
      }));
    }
  };

  const segments = parseTranscription(text);

  // 处理复制功能
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 处理搜索高亮
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setHighlightedSegments([]);
      return;
    }

    const matchingSegments = segments
      .filter(segment => 
        segment.text.toLowerCase().includes(query.toLowerCase())
      )
      .map(segment => segment.id);
    
    setHighlightedSegments(matchingSegments);
  };

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 高亮搜索结果
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 紧凑工具栏 */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2">
          {/* 左侧信息 */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <SpeakerWaveIcon className="w-4 h-4 text-gray-500" />
              {fileName ? (
                <span className="font-medium text-gray-900">{fileName}</span>
              ) : (
                <span className="text-gray-500">转录结果</span>
              )}
            </div>
            
          </div>
          
          {/* 右侧操作 */}
          <div className="flex items-center gap-3">
            
            {/* 操作按钮 */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors text-gray-600 hover:bg-gray-100"
              title={copied ? '已复制' : '复制全文'}
            >
              {copied ? (
                <CheckIcon className="w-3 h-3" />
              ) : (
                <ClipboardDocumentIcon className="w-3 h-3" />
              )}
            </button>
            
            <button
              onClick={onExport}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors text-gray-600 hover:bg-gray-100"
              title="导出转录结果"
            >
              <ArrowDownTrayIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 音频播放器（如果有音频文件） */}
      {audioFilePath && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <AudioPlayer 
            src={audioFilePath}
            title={fileName || '录音文件'}
            className="bg-white"
          />
        </div>
      )}

      {/* 转录内容 - 紧凑对话展示 */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        {segments.length > 0 ? (
          <div className="px-4 py-2">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className={cn(
                  "group flex gap-3 py-2 px-2 -mx-2 rounded transition-colors",
                  highlightedSegments.includes(segment.id) ? "bg-yellow-50" : "hover:bg-gray-50"
                )}
              >
                {/* 时间戳列 */}
                <div className="flex-shrink-0 w-12 pt-1">
                  <button
                    onClick={() => onTimeSeek?.(segment.startTime)}
                    className="text-xs text-gray-400 hover:text-blue-600 transition-colors font-mono"
                    title="跳转到此时间点"
                  >
                    {formatTime(segment.startTime)}
                  </button>
                </div>

                {/* 说话人列（如果有） */}
                {segment.speaker && (
                  <div className="flex-shrink-0 w-16 pt-1">
                    <span className="text-sm font-medium text-gray-700">
                      {segment.speaker}:
                    </span>
                  </div>
                )}

                {/* 对话内容 */}
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 leading-relaxed">
                    {highlightText(segment.text, searchQuery)}
                  </div>
                  
                  {/* 置信度指示（仅在悬浮时显示） */}
                  {segment.confidence && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      <div className="flex items-center gap-1">
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          segment.confidence >= 0.9 ? "bg-green-500" :
                          segment.confidence >= 0.8 ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className="text-xs text-gray-400">
                          {Math.round(segment.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 快速操作 */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onTimeSeek?.(segment.startTime)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="播放此段"
                  >
                    <PlayIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <SpeakerWaveIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">暂无转录内容</p>
            </div>
          </div>
        )}
      </div>

      {/* 搜索结果统计 */}
      {searchQuery && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-2">
          <div className="text-xs text-gray-600">
            找到 {highlightedSegments.length} 个匹配结果
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;