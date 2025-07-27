import React from 'react';
import { FolderIcon, SpeakerWaveIcon, MusicalNoteIcon, Cog6ToothIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../utils/cn';

interface FileInfo {
  name: string;
  path: string;
  size?: number;
}

interface AudioWorkspaceProps {
  fileInfo: FileInfo | null;
  isRecognizing: boolean;
  selectedLanguage: string;
  selectedMode: string;
  isDragOver: boolean;
  onFileSelect: () => void;
  onLanguageChange: (language: string) => void;
  onModeChange: (mode: string) => void;
  onRecognize: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

const AudioWorkspace: React.FC<AudioWorkspaceProps> = ({
  fileInfo,
  isRecognizing,
  selectedLanguage,
  selectedMode,
  isDragOver,
  onFileSelect,
  onLanguageChange,
  onModeChange,
  onRecognize,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp3': case 'wav': case 'flac': 
      case 'ogg': case 'aac': case 'm4a':
      case 'wma':
        return <MusicalNoteIcon className="w-5 h-5 text-macos-blue" />;
      default:
        return <MusicalNoteIcon className="w-5 h-5 text-macos-gray" />;
    }
  };

  return (
    <div className="macos-workspace macos-scrollbar">
      {/* Audio File Section */}
      <div className="macos-card">
        <div className="macos-section-header">
          <MusicalNoteIcon className="w-5 h-5 text-macos-blue" />
          <span className="macos-section-title">音频文件</span>
        </div>
        
        {!fileInfo ? (
          <div 
            className={cn(
              "macos-drop-zone",
              isDragOver && "drag-over"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onFileSelect}
            role="button"
            tabIndex={0}
            aria-label="选择或拖拽音频文件"
          >
            <MusicalNoteIcon className="w-12 h-12 text-macos-blue/30 mx-auto mb-4" />
            <div className="font-semibold mb-2 text-text-primary">选择音频文件</div>
            <div className="text-sm text-text-secondary mb-4">
              支持 MP3, WAV, FLAC, OGG, AAC, M4A, WMA
            </div>
            <button 
              className="macos-button inline-flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect();
              }}
              disabled={isRecognizing}
            >
              <FolderIcon className="w-4 h-4" />
              浏览文件
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-gray-50 rounded-macos-md p-4 mb-4">
              <div className="flex items-center font-semibold text-text-primary mb-2">
                <span className="mr-2">{getFileIcon(fileInfo.name)}</span>
                {fileInfo.name}
              </div>
              <div className="flex justify-between items-center text-sm text-text-secondary">
                {fileInfo.size && <span>{formatFileSize(fileInfo.size)}</span>}
                <span>{fileInfo.path.split('/').pop()}</span>
              </div>
            </div>
            
            {/* Audio Waveform */}
            <div className="bg-gradient-to-r from-macos-blue via-macos-green to-macos-purple rounded-macos-md mb-4 relative overflow-hidden cursor-pointer" style={{ height: '60px' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-30"></div>
              <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-white/20 transition-all duration-200"></div>
            </div>
            
            {/* Audio Controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button className="macos-play-button">
                <PlayIconSolid className="w-5 h-5" />
              </button>
              <span className="font-mono text-sm text-text-secondary min-w-[80px] text-center tabular-nums">00:00 / 00:00</span>
              <div className="flex items-center gap-2">
                <SpeakerWaveIcon className="w-4 h-4 text-text-secondary" />
                <div className="w-20 h-1 bg-border-secondary rounded-full relative cursor-pointer">
                  <div className="h-full bg-macos-blue rounded-full w-3/4 transition-all duration-150"></div>
                </div>
              </div>
            </div>
            
            <button 
              className="macos-button w-full"
              onClick={onFileSelect}
              disabled={isRecognizing}
            >
              <ArrowPathIcon className="w-4 h-4" />
              更换文件
            </button>
          </div>
        )}
      </div>

      {/* Processing Settings */}
      <div className="macos-card">
        <div className="macos-section-header">
          <Cog6ToothIcon className="w-5 h-5 text-macos-blue" />
          <span className="macos-section-title">处理设置</span>
        </div>
        
        <div className="flex flex-col gap-6">
          {/* Language Selection */}
          <div className="flex flex-col gap-2">
            <div className="text-base font-medium text-text-primary">识别语言</div>
            <div className="macos-segmented-control">
              <div 
                className={cn(
                  "macos-segmented-option",
                  selectedLanguage === 'zh' && "active"
                )}
                onClick={() => onLanguageChange('zh')}
              >
                中文
              </div>
              <div 
                className={cn(
                  "macos-segmented-option",
                  selectedLanguage === 'en' && "active"
                )}
                onClick={() => onLanguageChange('en')}
              >
                English
              </div>
              <div 
                className={cn(
                  "macos-segmented-option",
                  selectedLanguage === 'auto' && "active"
                )}
                onClick={() => onLanguageChange('auto')}
              >
                自动
              </div>
            </div>
          </div>

          {/* Speaker Recognition */}
          <div className="flex flex-col gap-2">
            <div className="text-base font-medium text-text-primary">说话人识别</div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-2 rounded-macos-md hover:bg-surface-hover transition-colors cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border-secondary text-macos-blue focus:ring-macos-blue focus:ring-2" />
                <span className="text-sm">启用多人对话识别</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-macos-md hover:bg-surface-hover transition-colors cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border-secondary text-macos-blue focus:ring-macos-blue focus:ring-2" />
                <span className="text-sm">智能角色分配</span>
              </label>
            </div>
          </div>

          {/* Processing Mode */}
          <div className="flex flex-col gap-2">
            <div className="text-base font-medium text-text-primary">处理模式</div>
            <div className="macos-segmented-control">
              <div 
                className={cn(
                  "macos-segmented-option",
                  selectedMode === 'standard' && "active"
                )}
                onClick={() => onModeChange('standard')}
              >
                标准质量
              </div>
              <div 
                className={cn(
                  "macos-segmented-option",
                  selectedMode === 'high_precision' && "active"
                )}
                onClick={() => onModeChange('high_precision')}
              >
                高精度
              </div>
            </div>
          </div>

          {/* Process Button */}
          <button 
            className="macos-action-button mt-6"
            onClick={onRecognize}
            disabled={!fileInfo || isRecognizing}
          >
            {isRecognizing ? (
              <>
                <div className="spinner"></div>
                <span>正在处理音频</span>
              </>
            ) : (
              <>
                <PlayIconSolid className="w-5 h-5" />
                <span>开始处理</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Processing */}
      <div className="macos-card">
        <div className="macos-section-header">
          <FolderIcon className="w-5 h-5 text-macos-blue" />
          <span className="macos-section-title">批量处理</span>
        </div>
        
        <div className="border-2 border-dashed border-border-secondary rounded-macos-md p-6 text-center text-text-secondary bg-surface-tertiary hover:border-macos-blue hover:bg-macos-blue/5 transition-all duration-200 cursor-pointer">
          <div className="text-2xl mb-2 opacity-30">+</div>
          <div className="font-semibold mb-1">+ 添加更多文件</div>
          <div className="text-sm text-text-tertiary">处理队列 (0)</div>
        </div>
      </div>
    </div>
  );
};

export default AudioWorkspace;